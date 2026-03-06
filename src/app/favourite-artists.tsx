import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { UserAvatar } from '@/components/design/UserAvatar';
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

  const targetUserId = userId ?? user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const [artists, setArtists] = useState<FavouriteArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFavourites = useCallback(async (isRefresh = false) => {
    if (!targetUserId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data } = await supabase
      .from('favourite_artists')
      .select('artist_id, artists(id, name, image_url, genre)')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    const parsed: FavouriteArtist[] = (data ?? []).map((row: any) => ({
      id: row.artists.id,
      name: row.artists.name,
      image_url: row.artists.image_url,
      genre: row.artists.genre,
      isFavourite: true,
    }));

    if (!isOwnProfile && user) {
      const artistIds = parsed.map((a) => a.id);
      if (artistIds.length > 0) {
        const { data: myFavs } = await supabase
          .from('favourite_artists')
          .select('artist_id')
          .eq('user_id', user.id)
          .in('artist_id', artistIds);
        const myFavSet = new Set((myFavs ?? []).map((f: any) => f.artist_id));
        for (const a of parsed) a.isFavourite = myFavSet.has(a.id);
      }
    }

    setArtists(parsed);
    setLoading(false);
    setRefreshing(false);
  }, [targetUserId, user, isOwnProfile]);

  useFocusEffect(useCallback(() => { fetchFavourites(); }, [fetchFavourites]));

  async function toggleFavourite(artistId: string, currentlyFav: boolean) {
    if (!user) return;
    setTogglingId(artistId);
    const { error } = currentlyFav
      ? await supabase.from('favourite_artists').delete().eq('user_id', user.id).eq('artist_id', artistId)
      : await supabase.from('favourite_artists').insert({ user_id: user.id, artist_id: artistId });

    if (error) {
      Alert.alert('Fout', `Kon artiest niet ${currentlyFav ? 'verwijderen uit' : 'toevoegen aan'} favorieten.`);
    } else {
      setArtists((prev) =>
        prev.map((a) => a.id === artistId ? { ...a, isFavourite: !currentlyFav } : a)
      );
    }
    setTogglingId(null);
  }

  const filtered = filter.trim()
    ? artists.filter((a) => a.name.toLowerCase().includes(filter.toLowerCase()))
    : artists;

  function renderArtist({ item }: { item: FavouriteArtist }) {
    const initials = item.name.substring(0, 2).toUpperCase();
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/artist/[id]', params: { id: item.id, name: item.name, imageUrl: item.image_url ?? '', genre: item.genre ?? '' } })}
      >
        <UserAvatar uri={item.image_url} initials={initials} size={56} />
        <View style={styles.info}>
          <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
          {item.genre ? <Text style={styles.genre} numberOfLines={1}>{item.genre}</Text> : null}
        </View>
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={(e) => { e.stopPropagation(); toggleFavourite(item.id, item.isFavourite); }}
          disabled={togglingId === item.id}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {togglingId === item.id
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Ionicons name={item.isFavourite ? 'heart' : 'heart-outline'} size={24} color={item.isFavourite ? Colors.primary : Colors.textMuted} />
          }
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Favoriete artiesten</Text>
      </View>

      {artists.length > 0 && (
        <View style={styles.filterRow}>
          <View style={styles.filterBox}>
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
        <LoadingScreen />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderArtist}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchFavourites(true)} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={filter ? 'Geen resultaten' : 'Nog geen favoriete artiesten'}
              subtitle={filter ? 'Probeer een andere zoekterm.' : 'Zoek een artiest en voeg ze toe aan je favorieten.'}
            />
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  title: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', flex: 1 },
  filterRow: { paddingHorizontal: Spacing.lg, marginVertical: Spacing.md },
  filterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterInput: { flex: 1, color: Colors.text, fontSize: FontSizes.sm, paddingVertical: 10 },
  list: { padding: Spacing.lg, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  info: { flex: 1 },
  artistName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  genre: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  heartBtn: { padding: Spacing.xs },
});
