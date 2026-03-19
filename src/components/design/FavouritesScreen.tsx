import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { UserAvatar } from '@/components/design/UserAvatar';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
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

// ── Config types ───────────────────────────────────────

interface FavouriteItem {
  id: string;
  name: string;
  subtitle: string | null;
  image_url: string | null;
  isFavourite: boolean;
}

interface FavouritesScreenConfig {
  /** Screen title shown in header */
  title: string;
  /** Supabase table name for favourites (e.g. 'favourite_artists') */
  favouriteTable: 'favourite_artists' | 'favourite_venues';
  /** Supabase table for the entity (e.g. 'artists') */
  entityTable: 'artists' | 'venues';
  /** FK column on the favourite table (e.g. 'artist_id') */
  fkColumn: string;
  /** Columns to select on the entity */
  entitySelect: string;
  /** Map entity row to a FavouriteItem */
  mapEntity: (row: Record<string, any>) => FavouriteItem;
  /** Route to navigate to on entity tap */
  onPress: (item: FavouriteItem, router: ReturnType<typeof useRouter>) => void;
  /** Placeholder text for filter */
  filterPlaceholder: string;
  /** Empty state subtitle when no favourites yet */
  emptySubtitle: string;
  /** Target user ID (optional, defaults to current user) */
  userId?: string;
}

// ── Component ──────────────────────────────────────────

export function FavouritesScreen({ config }: { config: FavouritesScreenConfig }) {
  const { user } = useAuth();
  const router = useRouter();

  const targetUserId = config.userId ?? user?.id;
  const isOwnProfile = !config.userId || config.userId === user?.id;

  const [items, setItems] = useState<FavouriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFavourites = useCallback(async (isRefresh = false) => {
    if (!targetUserId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data } = await supabase
      .from(config.favouriteTable)
      .select(`${config.fkColumn}, ${config.entityTable}(${config.entitySelect})`)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    const parsed: FavouriteItem[] = (data ?? []).map((row: any) => config.mapEntity(row[config.entityTable]));

    if (!isOwnProfile && user) {
      const entityIds = parsed.map((a) => a.id);
      if (entityIds.length > 0) {
        const { data: myFavs } = await supabase
          .from(config.favouriteTable)
          .select(config.fkColumn)
          .eq('user_id', user.id)
          .in(config.fkColumn, entityIds);
        const myFavSet = new Set((myFavs ?? []).map((f: any) => f[config.fkColumn]));
        for (const a of parsed) a.isFavourite = myFavSet.has(a.id);
      }
    }

    setItems(parsed);
    setLoading(false);
    setRefreshing(false);
  }, [targetUserId, user, isOwnProfile, config]);

  useFocusEffect(useCallback(() => { fetchFavourites(); }, [fetchFavourites]));

  async function toggleFavourite(entityId: string, currentlyFav: boolean) {
    if (!user) return;
    setTogglingId(entityId);
    const { error } = currentlyFav
      ? await supabase.from(config.favouriteTable).delete().eq('user_id', user.id).eq(config.fkColumn, entityId)
      : await supabase.from(config.favouriteTable).insert({ user_id: user.id, [config.fkColumn]: entityId });

    if (error) {
      Alert.alert('Fout', `Kon item niet ${currentlyFav ? 'verwijderen uit' : 'toevoegen aan'} favorieten.`);
    } else {
      setItems((prev) =>
        prev.map((a) => a.id === entityId ? { ...a, isFavourite: !currentlyFav } : a)
      );
    }
    setTogglingId(null);
  }

  const filtered = filter.trim()
    ? items.filter((a) => a.name.toLowerCase().includes(filter.toLowerCase()))
    : items;

  function renderItem({ item }: { item: FavouriteItem }) {
    const initials = item.name.substring(0, 2).toUpperCase();
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => config.onPress(item, router)}
      >
        <UserAvatar uri={item.image_url} initials={initials} size={56} />
        <View style={styles.info}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
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
        <Text style={styles.title}>{config.title}</Text>
      </View>

      {items.length > 0 && (
        <View style={styles.filterRow}>
          <View style={styles.filterBox}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.filterInput}
              placeholder={config.filterPlaceholder}
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
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchFavourites(true)} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={filter ? 'Geen resultaten' : `Nog geen ${config.title.toLowerCase()}`}
              subtitle={filter ? 'Probeer een andere zoekterm.' : config.emptySubtitle}
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
  itemName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  heartBtn: { padding: Spacing.xs },
});
