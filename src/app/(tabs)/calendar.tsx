import { AuthWall } from '@/components/design/AuthWall';
import { ConcertCard } from '@/components/design/ConcertCard';
import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { useAuth } from '@/core/context/AuthContext';
import { supabase } from '@/core/lib/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// colour tokens for the three categories
const CAT_COLORS = {
  interested: Colors.statusInterested,
  going: Colors.primary,
  group: Colors.statusGroup,
} as const;

const CAT_LABELS: Record<string, string> = {
  interested: 'Geïnteresseerd',
  going: 'Ik ga',
  group: 'Met groep',
};

/* types */
type Category = keyof typeof CAT_COLORS;

interface ConcertEntry {
  id: string;
  name: string;
  date: string;
  location_name: string;
  image_url: string;
  categories: Category[];
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [concerts, setConcerts] = useState<ConcertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // fetch all relevant concerts
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Concert statuses (interested / going)
    const { data: statusRows } = await supabase
      .from('concert_status')
      .select('event_id, status')
      .eq('user_id', user.id);

    // Groups the user is a member of
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    let groupEventIds: string[] = [];
    if (memberRows && memberRows.length > 0) {
      const groupIds = memberRows.map((r) => r.group_id);
      const { data: groupRows } = await supabase
        .from('groups')
        .select('event_id')
        .in('id', groupIds);
      groupEventIds = (groupRows ?? []).map((r) => r.event_id);
    }

    // Collect all unique event IDs
    const statusEventIds = (statusRows ?? []).map((r) => r.event_id);
    const allEventIds = [...new Set([...statusEventIds, ...groupEventIds])];

    if (allEventIds.length === 0) {
      setConcerts([]);
      setLoading(false);
      return;
    }

    // Fetch event details
    const { data: eventRows } = await supabase
      .from('events')
      .select('*')
      .in('id', allEventIds);

    // Category map pe event
    const catMap = new Map<string, Set<Category>>();
    for (const eid of allEventIds) {
      catMap.set(eid, new Set());
    }
    for (const row of statusRows ?? []) {
      catMap.get(row.event_id)?.add(row.status as Category);
    }
    for (const eid of groupEventIds) {
      catMap.get(eid)?.add('group');
    }

    const mapped: ConcertEntry[] = (eventRows ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date ?? '',
      location_name: e.location_name ?? 'Onbekend',
      image_url: e.image_url ?? '',
      categories: [...(catMap.get(e.id) ?? [])],
    }));

    setConcerts(mapped);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // derive marked dates for the calendar
  const markedDates = useMemo(() => {
    const marks: Record<string, { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};

    for (const c of concerts) {
      if (!c.date) continue;
      const dateKey = c.date.substring(0, 10);
      if (!marks[dateKey]) {
        marks[dateKey] = { dots: [] };
      }
      const existingKeys = new Set(marks[dateKey].dots.map((d) => d.key));
      for (const cat of c.categories) {
        if (!existingKeys.has(cat)) {
          marks[dateKey].dots.push({ key: cat, color: CAT_COLORS[cat] });
        }
      }
    }

    // Highlight selected date
    if (selectedDate && marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: Colors.surfaceLight };
    } else if (selectedDate) {
      marks[selectedDate] = { dots: [], selected: true, selectedColor: Colors.surfaceLight };
    }

    return marks;
  }, [concerts, selectedDate]);

  // concerts on selected date 
  const concertsOnDate = useMemo(() => {
    if (!selectedDate) return [];
    return concerts.filter((c) => c.date && c.date.substring(0, 10) === selectedDate);
  }, [concerts, selectedDate]);

  // upcoming concerts (today or later, sorted chronologically)
  const upcomingConcerts = useMemo(() => {
    const today = new Date().toISOString().substring(0, 10);
    return concerts
      .filter((c) => c.date && c.date.substring(0, 10) >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [concerts]);

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate((prev) => (prev === day.dateString ? null : day.dateString));
  }, []);

  if (!user) {
    return (
      <AuthWall
        title="Bekijk je agenda"
        subtitle="Log in om je concertagenda te bekijken en bij te houden."
      />
    );
  }

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.screenTitle}>Agenda</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Calendar
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={{
            calendarBackground: Colors.surface,
            dayTextColor: Colors.text,
            monthTextColor: Colors.text,
            textSectionTitleColor: Colors.textSecondary,
            todayTextColor: Colors.primary,
            selectedDayBackgroundColor: Colors.surfaceLight,
            selectedDayTextColor: Colors.text,
            arrowColor: Colors.primary,
            textDisabledColor: Colors.textMuted,
            textMonthFontWeight: 'bold',
            textMonthFontSize: FontSizes.lg,
            textDayFontSize: FontSizes.sm,
            textDayHeaderFontSize: FontSizes.xs,
          }}
          style={styles.calendar}
        />

        {/* Legend */}
        <View style={styles.legend}>
          {(Object.keys(CAT_COLORS) as Category[]).map((cat) => (
            <View key={cat} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CAT_COLORS[cat] }]} />
              <Text style={styles.legendLabel}>{CAT_LABELS[cat]}</Text>
            </View>
          ))}
        </View>

        {/* Selected date concerts */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('nl-BE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            {concertsOnDate.length > 0 ? (
              concertsOnDate.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.dateCard}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/concert/[id]', params: { id: c.id } })}
                >
                  <View style={styles.dateCardDots}>
                    {c.categories.map((cat) => (
                      <View key={cat} style={[styles.catDot, { backgroundColor: CAT_COLORS[cat] }]} />
                    ))}
                  </View>
                  <View style={styles.dateCardInfo}>
                    <Text style={styles.dateCardName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.dateCardVenue} numberOfLines={1}>
                      <Ionicons name="location-outline" size={12} color={Colors.textMuted} /> {c.location_name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noConcerts}>Geen concerten op deze dag</Text>
            )}
          </View>
        )}

        {/* Upcoming concerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aankomende concerten</Text>
          {upcomingConcerts.length > 0 ? (
            <View style={styles.upcomingGrid}>
              {upcomingConcerts.map((c) => (
                <View key={c.id} style={styles.upcomingCardWrapper}>
                  <ConcertCard
                    name={c.name}
                    date={c.date}
                    venue={c.location_name}
                    imageUrl={c.image_url}
                    fill
                    onPress={() => router.push({ pathname: '/concert/[id]', params: { id: c.id } })}
                  />
                  <View style={styles.upcomingBadges}>
                    {c.categories.map((cat) => (
                      <View key={cat} style={[styles.catBadge, { backgroundColor: CAT_COLORS[cat] }]}>
                        <Text style={styles.catBadgeText}>{CAT_LABELS[cat]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="Geen aankomende concerten"
              subtitle="Markeer concerten als geïnteresseerd of sluit je aan bij een groep."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  calendar: {
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    overflow: 'hidden',
  },

  /* Legend */
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },

  /* Sections */
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textTransform: 'capitalize',
  },

  /* Date concert list */
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dateCardDots: {
    flexDirection: 'column',
    gap: 4,
    marginRight: Spacing.md,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateCardInfo: {
    flex: 1,
    gap: 2,
  },
  dateCardName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  dateCardVenue: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  noConcerts: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  /* Upcoming grid */
  upcomingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  upcomingCardWrapper: {
    width: '47%',
  },
  upcomingBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: Spacing.xs,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  catBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
