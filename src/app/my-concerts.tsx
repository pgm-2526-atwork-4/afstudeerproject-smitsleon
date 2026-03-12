import { ConcertCard } from '@/components/design/ConcertCard';
import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StatusFilter = 'interested' | 'going';

const TITLES: Record<StatusFilter, string> = {
  interested: 'Geïnteresseerd',
  going: 'Gaat naar',
};

interface ConcertItem {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  venueId: string;
  city: string;
  imageUrl: string;
}

export default function MyConcertsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { status, userId } = useLocalSearchParams<{ status: StatusFilter; userId?: string }>();
  const [concerts, setConcerts] = useState<ConcertItem[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const targetUserId = userId || user?.id;
  const filter = (status as StatusFilter) || 'interested';

  const fetchConcerts = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);

    const { data: statusRows } = await supabase
      .from('concert_status')
      .select('event_id')
      .eq('user_id', targetUserId)
      .eq('status', filter)
      .order('created_at', { ascending: false });

    const eventIds = (statusRows ?? []).map((r: any) => r.event_id);

    if (eventIds.length === 0) {
      setConcerts([]);
      setLoading(false);
      return;
    }

    const { data: eventRows } = await supabase
      .from('events')
      .select('*')
      .in('id', eventIds);

    const mapped: ConcertItem[] = (eventRows ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.date ?? '',
      time: '',
      venue: e.location_name ?? 'Onbekend',
      venueId: '',
      city: '',
      imageUrl: e.image_url ?? '',
    }));

    // Sort to match the order from concert_status (newest first)
    const idOrder = new Map(eventIds.map((id: string, i: number) => [id, i]));
    mapped.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

    // Group counts
    const { data: gcRows } = await supabase.from('groups').select('event_id').in('event_id', eventIds);
    const counts: Record<string, number> = {};
    for (const row of gcRows ?? []) {
      counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
    }
    setGroupCounts(counts);

    setConcerts(mapped);
    setLoading(false);
  }, [targetUserId, filter]);

  useEffect(() => { fetchConcerts(); }, [fetchConcerts]);

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{TITLES[filter]}</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={concerts}
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
              onPress={() =>
                router.push({ pathname: '/concert/[id]', params: { id: item.id } })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
            title={filter === 'going' ? 'Geen concerten' : 'Geen interesses'}
            subtitle={
              filter === 'going'
                ? 'Nog geen concerten gemarkeerd als "Ik ga".'
                : 'Nog geen concerten gemarkeerd als geïnteresseerd.'
            }
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
