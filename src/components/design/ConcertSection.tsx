import { Event } from '@/core/types';
import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ConcertCard } from './ConcertCard';

interface Props {
  title: string;
  events: Event[];
  /** Map of event ID → group count */
  groupCounts?: Record<string, number>;
  onEventPress: (event: Event) => void;
  /** Max events to show before "Zie meer". Default: 6 */
  maxVisible?: number;
  /** Called when "Zie meer" is tapped. Only shown if events.length > maxVisible. */
  onSeeMore?: () => void;
}

/**
 * Horizontal scrolling section of concert cards with a section title.
 * Shows a "Zie meer" link when events exceed maxVisible.
 * Hidden when events array is empty.
 */
export function ConcertSection({
  title,
  events,
  groupCounts = {},
  onEventPress,
  maxVisible = 6,
  onSeeMore,
}: Props) {
  if (events.length === 0) return null;

  const visible = events.slice(0, maxVisible);
  const hasMore = events.length > maxVisible;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {hasMore && onSeeMore && (
          <TouchableOpacity onPress={onSeeMore} style={styles.seeMoreBtn}>
            <Text style={styles.seeMoreText}>Zie meer</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {visible.map((event) => (
          <ConcertCard
            key={event.id}
            name={event.name}
            date={event.date}
            venue={event.venue}
            imageUrl={event.imageUrl}
            groupCount={groupCounts[event.id] ?? 0}
            onPress={() => onEventPress(event)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeMoreText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
});
