import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ArtistChip {
  id: string;
  name: string;
  image_url: string | null;
  genre: string | null;
}

interface Props {
  artists: ArtistChip[];
  /** Max number of artist chips to show before showing the overflow indicator. Default: 5 */
  maxVisible?: number;
  /** Called when an artist chip is tapped. */
  onArtistPress?: (artist: ArtistChip) => void;
  /** Called when the overflow chip is tapped. If omitted, overflow chip is hidden. */
  onMorePress?: () => void;
}

/**
 * Horizontal wrapping grid of circular artist chips with name below.
 * If more artists than maxVisible, shows a +N chip.
 *
 * Navigation is handled by the parent via onArtistPress/onMorePress callbacks,
 * keeping this component decoupled from routing.
 */
export function ArtistChipsGrid({ artists, maxVisible = 5, onArtistPress, onMorePress }: Props) {
  const visible = artists.slice(0, maxVisible);
  const overflow = artists.length - maxVisible;

  return (
    <View style={styles.grid}>
      {visible.map((artist) => (
        <TouchableOpacity
          key={artist.id}
          style={styles.chip}
          activeOpacity={0.7}
          onPress={() => onArtistPress?.(artist)}
        >
          {artist.image_url ? (
            <Image source={{ uri: artist.image_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="musical-note" size={16} color={Colors.textMuted} />
            </View>
          )}
          <Text style={styles.name} numberOfLines={1}>
            {artist.name}
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
