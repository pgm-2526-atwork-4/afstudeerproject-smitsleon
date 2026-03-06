import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  placeholder?: string;
}

/**
 * Chat input bar with multiline text field and send button.
 */
export function ChatInput({ value, onChange, onSend, sending, placeholder = 'Schrijf een bericht...' }: Props) {
  const canSend = value.trim().length > 0 && !sending;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChange}
        multiline
        maxLength={1000}
      />
      <TouchableOpacity
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!canSend}
        activeOpacity={0.8}
      >
        <Ionicons name="send" size={20} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    color: Colors.text,
    fontSize: FontSizes.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
});
