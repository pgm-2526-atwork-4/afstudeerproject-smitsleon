import { ConcertCard } from '@/components/design/ConcertCard';
import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { dbRowToEvent, Event } from '@/core/types';
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
    let result: Event[] = [];
    const now = new Date().toISOString();

    switch (section) {
      case 'upcoming': {
        const { data: rows } = await supabase
          .from('events')
          .select('*')
          .gte('date', now)
          .order('date', { ascending: true })
          .limit(50);
        result = (rows ?? []).map(dbRowToEvent);
        break;
      }

      case 'buddies': {
        if (!user) break;
        const buddyIds = await getBuddyIds(user.id);
        if (buddyIds.length === 0) break;
        const { data: statusRows } = await supabase
          .from('concert_status')
          .select('event_id')
          .in('user_id', buddyIds)
          .eq('status', 'going');
        const eventIds = [...new Set((statusRows ?? []).map((r: any) => r.event_id))];
        if (eventIds.length === 0) break;
        const { data: eventRows } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds)
          .gte('date', now)
          .order('date', { ascending: true });
        result = (eventRows ?? []).map(dbRowToEvent);
        break;
      }

      case 'buddyInterested': {
        if (!user) break;
        const buddyIds2 = await getBuddyIds(user.id);
        if (buddyIds2.length === 0) break;
        const { data: statusRows2 } = await supabase
          .from('concert_status')
          .select('event_id')
          .in('user_id', buddyIds2)
          .eq('status', 'interested');
        const eventIds2 = [...new Set((statusRows2 ?? []).map((r: any) => r.event_id))];
        if (eventIds2.length === 0) break;
        const { data: eventRows2 } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds2)
          .gte('date', now)
          .order('date', { ascending: true });
        result = (eventRows2 ?? []).map(dbRowToEvent);
        break;
      }

      case 'favouriteArtists': {
        if (!user) break;
        const { data: favRows } = await supabase
          .from('favourite_artists')
          .select('artists(name)')
          .eq('user_id', user.id)
          .limit(5);
        const artistNames = (favRows ?? []).map((r: any) => r.artists?.name).filter(Boolean) as string[];
        if (artistNames.length === 0) break;
        const filter = artistNames.map((n) => `name.ilike.%${n}%`).join(',');
        const { data: rows } = await supabase
          .from('events')
          .select('*')
          .or(filter)
          .gte('date', now)
          .order('date', { ascending: true })
          .limit(20);
        result = (rows ?? []).map(dbRowToEvent);
        break;
      }

      case 'favouriteVenues': {
        if (!user) break;
        const { data: favVRows } = await supabase
          .from('favourite_venues')
          .select('venue_id')
          .eq('user_id', user.id);
        const venueIds = (favVRows ?? []).map((r: any) => r.venue_id).filter(Boolean) as string[];
        if (venueIds.length === 0) break;
        const { data: vRows } = await supabase
          .from('events')
          .select('*')
          .in('venue_id', venueIds)
          .gte('date', now)
          .order('date', { ascending: true })
          .limit(50);
        result = (vRows ?? []).map(dbRowToEvent);
        break;
      }

      case 'withGroups': {
        const { data: grpRows } = await supabase
          .from('groups')
          .select('event_id')
          .limit(200);
        const grpEventIds = [...new Set((grpRows ?? []).map((r: any) => r.event_id))];
        if (grpEventIds.length === 0) break;
        const { data: gRows } = await supabase
          .from('events')
          .select('*')
          .in('id', grpEventIds)
          .gte('date', now)
          .order('date', { ascending: true })
          .limit(50);
        result = (gRows ?? []).map(dbRowToEvent);
        break;
      }

      case 'nearby': {
        if (!profile?.share_location || !profile.latitude || !profile.longitude) break;
        const radiusKm = 50;
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos((profile.latitude * Math.PI) / 180));
        const { data: rows } = await supabase
          .from('events')
          .select('*')
          .gte('date', now)
          .gte('latitude', profile.latitude - latDelta)
          .lte('latitude', profile.latitude + latDelta)
          .gte('longitude', profile.longitude - lngDelta)
          .lte('longitude', profile.longitude + lngDelta)
          .order('date', { ascending: true })
          .limit(50);
        result = (rows ?? [])
          .filter((e: any) =>
            e.latitude && e.longitude
              ? distanceKm(profile.latitude!, profile.longitude!, e.latitude, e.longitude) <= radiusKm
              : false
          )
          .map(dbRowToEvent);
        break;
      }
    }

    // Fetch group counts
    if (result.length > 0) {
      const ids = result.map((e) => e.id);
      const { data: gcRows } = await supabase.from('groups').select('event_id').in('event_id', ids);
      const counts: Record<string, number> = {};
      for (const row of gcRows ?? []) {
        counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
      }
      // Sort: events with groups first
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
