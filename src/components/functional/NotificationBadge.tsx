import { Colors, FontSizes, Radius } from '@/style/theme';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  count: number;
}

/**
 * Red badge showing an unread count. Hidden when count is 0.
 */
export function NotificationBadge({ count }: Props) {
  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
});
