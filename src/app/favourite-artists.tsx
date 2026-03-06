import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FavouriteArtist {
  id: string;
  name: string;
  image_url: string | null;
  genre: string | null;
  isFavourite: boolean;
}

export default function FavouriteArtistsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  // If userId is provided, show that user's artists; otherwise show own
  const targetUserId = userId ?? user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const [artists, setArtists] = useState<FavouriteArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFavourites = useCallback(
    async (isRefresh = false) => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch target user's favourite artists
      const { data, error } = await supabase
        .from('favourite_artists')
        .select('artist_id, artists(id, name, image_url, genre)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favourites:', error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const parsed: FavouriteArtist[] = (data ?? []).map((row: any) => ({
        id: row.artists.id,
        name: row.artists.name,
        image_url: row.artists.image_url,
        genre: row.artists.genre,
        isFavourite: true, // default for the target user
      }));

      // If viewing another user's list, check which artists the current user follows
      if (!isOwnProfile && user) {
        const artistIds = parsed.map((a) => a.id);
        if (artistIds.length > 0) {
          const { data: myFavs } = await supabase
            .from('favourite_artists')
            .select('artist_id')
            .eq('user_id', user.id)
            .in('artist_id', artistIds);

          const myFavSet = new Set((myFavs ?? []).map((f: any) => f.artist_id));
          for (const artist of parsed) {
            artist.isFavourite = myFavSet.has(artist.id);
          }
        }
      }

      setArtists(parsed);
      setLoading(false);
      setRefreshing(false);
    },
    [targetUserId, user, isOwnProfile]
  );

  useFocusEffect(
    useCallback(() => {
      fetchFavourites();
    }, [fetchFavourites])
  );

  async function toggleFavourite(artistId: string, currentlyFav: boolean) {
    if (!user) return;
    setTogglingId(artistId);

    if (currentlyFav) {
      // Remove from favourites
      const { error } = await supabase
        .from('favourite_artists')
        .delete()
        .eq('user_id', user.id)
        .eq('artist_id', artistId);

      if (error) {
        Alert.alert('Fout', 'Kon artiest niet verwijderen uit favorieten.');
      } else {
        setArtists((prev) =>
          prev.map((a) => (a.id === artistId ? { ...a, isFavourite: false } : a))
        );
      }
    } else {
      // Add to favourites
      const { error } = await supabase
        .from('favourite_artists')
        .insert({ user_id: user.id, artist_id: artistId });

      if (error) {
        Alert.alert('Fout', 'Kon artiest niet toevoegen aan favorieten.');
      } else {
        setArtists((prev) =>
          prev.map((a) => (a.id === artistId ? { ...a, isFavourite: true } : a))
        );
      }
    }
    setTogglingId(null);
  }

  const filteredArtists = filter.trim()
    ? artists.filter((a) =>
        a.name.toLowerCase().includes(filter.toLowerCase())
      )
    : artists;

  function renderArtist({ item }: { item: FavouriteArtist }) {
    const isToggling = togglingId === item.id;

    return (
      <TouchableOpacity
        style={styles.artistCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/artist/[id]',
            params: {
              id: item.id,
              name: item.name,
              imageUrl: item.image_url ?? '',
              genre: item.genre ?? '',
            },
          })
        }
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="musical-notes" size={24} color={Colors.textMuted} />
          </View>
        )}
        <View style={styles.artistInfo}>
          <Text style={styles.artistName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.genre ? (
            <Text style={styles.artistGenre} numberOfLines={1}>
              {item.genre}
            </Text>
          ) : null}
        </View>

        {/* Heart toggle (always visible) */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavourite(item.id, item.isFavourite);
          }}
          disabled={isToggling}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons
              name={item.isFavourite ? 'heart' : 'heart-outline'}
              size={24}
              color={item.isFavourite ? Colors.primary : Colors.textMuted}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Favoriete artiesten</Text>
      </View>

      {/* Filter bar */}
      {artists.length > 0 && (
        <View style={styles.filterRow}>
          <View style={styles.filterInputWrapper}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.filterInput}
              placeholder="Filter artiesten..."
              placeholderTextColor={Colors.textMuted}
              value={filter}
              onChangeText={setFilter}
            />
            {filter.length > 0 && (
              <TouchableOpacity onPress={() => setFilter('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredArtists}
          keyExtractor={(item) => item.id}
          renderItem={renderArtist}
          contentContainerStyle={filteredArtists.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFavourites(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {filter ? 'Geen resultaten' : 'Nog geen favoriete artiesten'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter
                  ? 'Probeer een andere zoekterm.'
                  : 'Zoek een artiest en voeg ze toe aan je favorieten.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    flex: 1,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.sm,
    paddingVertical: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLight,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInfo: { flex: 1 },
  artistName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  artistGenre: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  heartButton: {
    padding: Spacing.xs,
  },
});
