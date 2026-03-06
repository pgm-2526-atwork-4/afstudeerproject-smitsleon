import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  title: string;
  onBack: () => void;
  rightElement?: ReactNode;
}

/**
 * Consistent screen header: back arrow on left, title, optional element on right.
 */
export function ScreenHeader({ title, onBack, rightElement }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightElement ? (
        <View style={styles.right}>{rightElement}</View>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 50,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  right: {
    alignItems: 'flex-end',
  },
  rightPlaceholder: {
    width: 32,
  },
});
