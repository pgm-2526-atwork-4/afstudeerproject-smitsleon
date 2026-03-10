import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface VenueChip {
  id: string;
  name: string;
  city: string | null;
  image_url: string | null;
}

interface Props {
  venues: VenueChip[];
  maxVisible?: number;
  onVenuePress?: (venue: VenueChip) => void;
  onMorePress?: () => void;
}

export function VenueChipsGrid({ venues, maxVisible = 5, onVenuePress, onMorePress }: Props) {
  const visible = venues.slice(0, maxVisible);
  const overflow = venues.length - maxVisible;

  return (
    <View style={styles.grid}>
      {visible.map((venue) => (
        <TouchableOpacity
          key={venue.id}
          style={styles.chip}
          activeOpacity={0.7}
          onPress={() => onVenuePress?.(venue)}
        >
          {venue.image_url ? (
            <Image source={{ uri: venue.image_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="location" size={16} color={Colors.textMuted} />
            </View>
          )}
          <Text style={styles.name} numberOfLines={1}>
            {venue.name}
          </Text>
        </TouchableOpacity>
      ))}

      {overflow > 0 && onMorePress && (
        <TouchableOpacity style={styles.chip} activeOpacity={0.7} onPress={onMorePress}>
          <View style={[styles.avatar, styles.overflowChip]}>
            <Text style={styles.overflowText}>+{overflow}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            Meer
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  chip: {
    alignItems: 'center',
    width: 72,
    gap: Spacing.xs,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceLight,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowChip: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overflowText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  name: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
});
