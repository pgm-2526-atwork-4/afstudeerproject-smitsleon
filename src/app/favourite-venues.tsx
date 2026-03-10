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

interface FavouriteVenue {
  id: string;
  name: string;
  city: string | null;
  image_url: string | null;
  isFavourite: boolean;
}

export default function FavouriteVenuesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const targetUserId = userId ?? user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const [venues, setVenues] = useState<FavouriteVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFavourites = useCallback(async (isRefresh = false) => {
    if (!targetUserId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data } = await supabase
      .from('favourite_venues')
      .select('venue_id, venues(id, name, city, image_url)')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    const parsed: FavouriteVenue[] = (data ?? []).map((row: any) => ({
      id: row.venues.id,
      name: row.venues.name,
      city: row.venues.city,
      image_url: row.venues.image_url,
      isFavourite: true,
    }));

    if (!isOwnProfile && user) {
      const venueIds = parsed.map((v) => v.id);
      if (venueIds.length > 0) {
        const { data: myFavs } = await supabase
          .from('favourite_venues')
          .select('venue_id')
          .eq('user_id', user.id)
          .in('venue_id', venueIds);
        const myFavSet = new Set((myFavs ?? []).map((f: any) => f.venue_id));
        for (const v of parsed) v.isFavourite = myFavSet.has(v.id);
      }
    }

    setVenues(parsed);
    setLoading(false);
    setRefreshing(false);
  }, [targetUserId, user, isOwnProfile]);

  useFocusEffect(useCallback(() => { fetchFavourites(); }, [fetchFavourites]));

  async function toggleFavourite(venueId: string, currentlyFav: boolean) {
    if (!user) return;
    setTogglingId(venueId);
    const { error } = currentlyFav
      ? await supabase.from('favourite_venues').delete().eq('user_id', user.id).eq('venue_id', venueId)
      : await supabase.from('favourite_venues').insert({ user_id: user.id, venue_id: venueId });

    if (error) {
      Alert.alert('Fout', `Kon venue niet ${currentlyFav ? 'verwijderen uit' : 'toevoegen aan'} favorieten.`);
    } else {
      setVenues((prev) =>
        prev.map((v) => v.id === venueId ? { ...v, isFavourite: !currentlyFav } : v)
      );
    }
    setTogglingId(null);
  }

  const filtered = filter.trim()
    ? venues.filter((v) => v.name.toLowerCase().includes(filter.toLowerCase()))
    : venues;

  function renderVenue({ item }: { item: FavouriteVenue }) {
    const initials = item.name.substring(0, 2).toUpperCase();
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/venue/[id]', params: { id: item.id, name: item.name, city: item.city ?? '' } })}
      >
        <UserAvatar uri={item.image_url} initials={initials} size={56} />
        <View style={styles.info}>
          <Text style={styles.venueName} numberOfLines={1}>{item.name}</Text>
          {item.city ? <Text style={styles.city} numberOfLines={1}>{item.city}</Text> : null}
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
        <Text style={styles.title}>Favoriete venues</Text>
      </View>

      {venues.length > 0 && (
        <View style={styles.filterRow}>
          <View style={styles.filterBox}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.filterInput}
              placeholder="Filter venues..."
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
          renderItem={renderVenue}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchFavourites(true)} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={filter ? 'Geen resultaten' : 'Nog geen favoriete venues'}
              subtitle={filter ? 'Probeer een andere zoekterm.' : 'Ga naar een venue pagina en voeg ze toe aan je favorieten.'}
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
  venueName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  city: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  heartBtn: { padding: Spacing.xs },
});
