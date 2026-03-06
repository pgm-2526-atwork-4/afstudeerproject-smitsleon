import { Colors, FontSizes } from '@/style/theme';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  content: string;
  isOwn: boolean;
  isDeleted: boolean;
  onLongPress?: () => void;
}

/**
 * A single chat message bubble. Own messages appear on the right, others on the left.
 * Deleted messages show italic placeholder text.
 */
export function ChatBubble({ content, isOwn, isDeleted, onLongPress }: Props) {
  if (isDeleted) {
    return (
      <View style={[styles.bubble, styles.deleted]}>
        <Text style={styles.deletedText}>Dit bericht is verwijderd</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={onLongPress}
      delayLongPress={500}
      style={[styles.bubble, isOwn ? styles.own : styles.other]}
    >
      <Text style={styles.text}>{content}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  own: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  other: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  deleted: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    color: Colors.text,
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  deletedText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
  },
});
