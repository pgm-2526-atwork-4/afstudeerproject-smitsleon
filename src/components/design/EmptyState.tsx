import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

/**
 * Centered empty state display with icon, title and optional subtitle.
 */
export function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={Colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: Spacing.md,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
