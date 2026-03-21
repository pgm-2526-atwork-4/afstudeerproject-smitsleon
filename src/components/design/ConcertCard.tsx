import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  name: string;
  date: string;
  venue: string;
  imageUrl: string;
  groupCount?: number;
  /** If true, card fills its parent width instead of fixed 160px */
  fill?: boolean;
  onPress: () => void;
}

/**
 * Compact concert card for home page sections.
 * Shows event image, name, date, venue, and optional group count badge.
 */
export function ConcertCard({ name, date, venue, imageUrl, groupCount = 0, fill, onPress }: Props) {
  // Format date to short Dutch format: "15 mrt"
  const shortDate = (() => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return date;
    }
  })();

  return (
    <TouchableOpacity style={[styles.card, fill && styles.cardFill]} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.imageWrapper, fill && styles.imageWrapperFill]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={28} color={Colors.textMuted} />
          </View>
        )}
        {groupCount > 0 && (
          <View style={styles.badge}>
            <Ionicons name="people" size={12} color="#fff" />
            <Text style={styles.badgeText}>{groupCount}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
        <Text style={styles.metaText}>{shortDate}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>{venue}</Text>
      </View>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 160;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    gap: 4,
  },
  cardFill: {
    width: '100%',
  },
  imageWrapper: {
    position: 'relative',
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  imageWrapperFill: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: 'bold',
  },
  name: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
});
