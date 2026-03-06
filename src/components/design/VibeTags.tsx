import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  tags: string[];
}

/**
 * Horizontal wrapping row of pill-shaped vibe tags.
 */
export function VibeTags({ tags }: Props) {
  if (tags.length === 0) return null;

  return (
    <View style={styles.row}>
      {tags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tagText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
});
