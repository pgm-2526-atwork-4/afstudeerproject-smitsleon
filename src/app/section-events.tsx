import { ConcertCard } from '@/components/design/ConcertCard';
import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { searchEvents } from '@/core/ticketmaster';
import { Event } from '@/core/types';
import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SectionType = 'upcoming' | 'buddies' | 'favouriteArtists' | 'nearby';

const SECTION_TITLES: Record<SectionType, string> = {
  upcoming: 'Binnenkort',
  buddies: 'Je buddies gaan ook',
  favouriteArtists: 'Favoriete artiesten',
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

    switch (section) {
      case 'upcoming':
        result = await searchEvents().catch(() => []);
        break;

      case 'buddies': {
        if (!user) break;
        const { data: buddyRows } = await supabase
          .from('buddies')
          .select('user_id_1, user_id_2')
          .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
        const buddyIds = (buddyRows ?? []).map((r: any) =>
          r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1
        );
        if (buddyIds.length === 0) break;
        const { data: memberRows } = await supabase
          .from('group_members')
          .select('group_id')
          .in('user_id', buddyIds);
        const groupIds = [...new Set((memberRows ?? []).map((r: any) => r.group_id))];
        if (groupIds.length === 0) break;
        const { data: groupRows } = await supabase
          .from('groups')
          .select('event_id')
          .in('id', groupIds);
        const eventIds = [...new Set((groupRows ?? []).map((r: any) => r.event_id))];
        if (eventIds.length === 0) break;
        const { data: eventRows } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true });
        result = (eventRows ?? []).map((e: any) => ({
          id: e.id,
          name: e.name,
          date: e.date ?? '',
          time: '',
          venue: e.location_name ?? 'Onbekend',
          venueId: e.venue_id ?? '',
          city: '',
          imageUrl: e.image_url ?? '',
        }));
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
        const results = await Promise.allSettled(artistNames.map((n) => searchEvents(n)));
        const seen = new Set<string>();
        for (const r of results) {
          if (r.status === 'fulfilled') {
            for (const e of r.value) {
              if (!seen.has(e.id)) { seen.add(e.id); result.push(e); }
            }
          }
        }
        break;
      }

      case 'nearby': {
        if (!profile?.share_location || !profile.latitude || !profile.longitude) break;
        result = await searchEvents(undefined, {
          latlong: `${profile.latitude},${profile.longitude}`,
          radius: 50,
        }).catch(() => []);
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
    router.push({
      pathname: '/concert/[id]',
      params: {
        id: event.id,
        name: event.name,
        date: event.date,
        time: event.time,
        venue: event.venue,
        venueId: event.venueId,
        city: event.city,
        imageUrl: event.imageUrl,
        url: event.url ?? '',
      },
    });
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
