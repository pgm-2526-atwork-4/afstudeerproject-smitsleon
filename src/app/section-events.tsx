import { ConcertCard } from '@/components/design/ConcertCard';
import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { useAuth } from '@/core/AuthContext';
import { ConcertStatusEventId, DbEvent, FavArtistWithName, FavVenueId, GroupEventId } from '@/core/database.types';
import { supabase } from '@/core/supabase';
import { dbRowToEvent, Event, UserProfile } from '@/core/types';
import { distanceKm, getBuddyIds } from '@/core/utils';
import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SectionType = 'upcoming' | 'buddies' | 'buddyInterested' | 'favouriteArtists' | 'favouriteVenues' | 'withGroups' | 'nearby';

const SECTION_TITLES: Record<SectionType, string> = {
  upcoming: 'Binnenkort',
  buddies: 'Je buddies gaan ook',
  buddyInterested: 'Buddies geïnteresseerd',
  favouriteArtists: 'Favoriete artiesten',
  favouriteVenues: 'Favoriete venues',
  withGroups: 'Concerten met groepen',
  nearby: 'In de buurt',
};

/* ── Per-section fetch helpers ──────────────────────────────── */

async function fetchUpcoming(now: string): Promise<Event[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .gte('date', now)
    .order('date', { ascending: true })
    .limit(50);
  return (data ?? []).map(dbRowToEvent);
}

async function fetchBuddyEvents(
  userId: string,
  now: string,
  status: 'going' | 'interested',
): Promise<Event[]> {
  const buddyIds = await getBuddyIds(userId);
  if (buddyIds.length === 0) return [];
  const { data: statusRows } = await supabase
    .from('concert_status')
    .select('event_id')
    .in('user_id', buddyIds)
    .eq('status', status);
  const eventIds = [...new Set((statusRows ?? []).map((r: ConcertStatusEventId) => r.event_id))];
  if (eventIds.length === 0) return [];
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds)
    .gte('date', now)
    .order('date', { ascending: true });
  return (data ?? []).map(dbRowToEvent);
}

async function fetchFavouriteArtists(userId: string, now: string): Promise<Event[]> {
  const { data: favRows } = await supabase
    .from('favourite_artists')
    .select('artists(name)')
    .eq('user_id', userId)
    .limit(5);
  const artistNames = ((favRows ?? []) as unknown as FavArtistWithName[]).map((r) => r.artists?.name).filter(Boolean) as string[];
  if (artistNames.length === 0) return [];
  const filter = artistNames.map((n) => `name.ilike.%${n}%`).join(',');
  const { data } = await supabase
    .from('events')
    .select('*')
    .or(filter)
    .gte('date', now)
    .order('date', { ascending: true })
    .limit(20);
  return (data ?? []).map(dbRowToEvent);
}

async function fetchFavouriteVenues(userId: string, now: string): Promise<Event[]> {
  const { data: favVRows } = await supabase
    .from('favourite_venues')
    .select('venue_id')
    .eq('user_id', userId);
  const venueIds = (favVRows ?? []).map((r: FavVenueId) => r.venue_id).filter(Boolean) as string[];
  if (venueIds.length === 0) return [];
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('venue_id', venueIds)
    .gte('date', now)
    .order('date', { ascending: true })
    .limit(50);
  return (data ?? []).map(dbRowToEvent);
}

async function fetchWithGroups(now: string): Promise<Event[]> {
  const { data: grpRows } = await supabase
    .from('groups')
    .select('event_id')
    .limit(200);
  const grpEventIds = [...new Set((grpRows ?? []).map((r: GroupEventId) => r.event_id))];
  if (grpEventIds.length === 0) return [];
  const { data } = await supabase
    .from('events')
    .select('*')
    .in('id', grpEventIds)
    .gte('date', now)
    .order('date', { ascending: true })
    .limit(50);
  return (data ?? []).map(dbRowToEvent);
}

async function fetchNearby(lat: number, lng: number, now: string): Promise<Event[]> {
  const radiusKm = 50;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const { data } = await supabase
    .from('events')
    .select('*')
    .gte('date', now)
    .gte('latitude', lat - latDelta)
    .lte('latitude', lat + latDelta)
    .gte('longitude', lng - lngDelta)
    .lte('longitude', lng + lngDelta)
    .order('date', { ascending: true })
    .limit(50);
  return (data ?? [])
    .filter((e: DbEvent) =>
      e.latitude && e.longitude
        ? distanceKm(lat, lng, e.latitude, e.longitude) <= radiusKm
        : false
    )
    .map(dbRowToEvent);
}

/* ── Strategy map ───────────────────────────────────────────── */

interface FetchContext {
  userId?: string;
  profile: UserProfile | null;
  now: string;
}

const SECTION_FETCHERS: Record<SectionType, (ctx: FetchContext) => Promise<Event[]>> = {
  upcoming:         (ctx) => fetchUpcoming(ctx.now),
  buddies:          (ctx) => ctx.userId ? fetchBuddyEvents(ctx.userId, ctx.now, 'going') : Promise.resolve([]),
  buddyInterested:  (ctx) => ctx.userId ? fetchBuddyEvents(ctx.userId, ctx.now, 'interested') : Promise.resolve([]),
  favouriteArtists: (ctx) => ctx.userId ? fetchFavouriteArtists(ctx.userId, ctx.now) : Promise.resolve([]),
  favouriteVenues:  (ctx) => ctx.userId ? fetchFavouriteVenues(ctx.userId, ctx.now) : Promise.resolve([]),
  withGroups:       (ctx) => fetchWithGroups(ctx.now),
  nearby:           (ctx) => {
    const p = ctx.profile;
    return p?.share_location && p.latitude && p.longitude
      ? fetchNearby(p.latitude, p.longitude, ctx.now)
      : Promise.resolve([]);
  },
};

export default function SectionEventsScreen() {
  const { section } = useLocalSearchParams<{ section: SectionType }>();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const title = SECTION_TITLES[section as SectionType] ?? 'Concerten';

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const ctx: FetchContext = { userId: user?.id, profile, now: new Date().toISOString() };
    const fetcher = SECTION_FETCHERS[section as SectionType];
    const result = fetcher ? await fetcher(ctx) : [];

    if (result.length > 0) {
      const ids = result.map((e) => e.id);
      const { data: gcRows } = await supabase.from('groups').select('event_id').in('event_id', ids);
      const counts: Record<string, number> = {};
      for (const row of gcRows ?? []) {
        counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
      }
      result.sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
      setGroupCounts(counts);
    }

    setEvents(result);
    setLoading(false);
  }, [section, user, profile]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function navigateToEvent(event: Event) {
    router.push({ pathname: '/concert/[id]', params: { id: event.id } });
  }

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ConcertCard
              name={item.name}
              date={item.date}
              venue={item.venue}
              imageUrl={item.imageUrl}
              groupCount={groupCounts[item.id] ?? 0}
              fill
              onPress={() => navigateToEvent(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title="Geen concerten"
            subtitle="Er zijn momenteel geen concerten in deze categorie."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40, paddingTop: Spacing.sm },
  row: { justifyContent: 'space-between', marginBottom: Spacing.lg },
  cardWrapper: { width: '48%' },
});
