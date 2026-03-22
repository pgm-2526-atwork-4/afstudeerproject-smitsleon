import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  labelColor?: string;
  onPress?: () => void;
}

export function MetaItem({ icon, iconColor = Colors.textSecondary, label, labelColor, onPress }: Props) {
  const content = (
    <>
      <Ionicons name={icon} size={14} color={iconColor} />
      <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
});
