import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  placeholder?: string;
  onLocationPress?: () => void;
  locationLoading?: boolean;
  onImagePress?: () => void;
  imageLoading?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  sending,
  placeholder = 'Schrijf een bericht...',
  onLocationPress,
  locationLoading,
  onImagePress,
  imageLoading,
}: Props) {
  const canSend = value.trim().length > 0 && !sending;
  const showIcons = onImagePress || onLocationPress;

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, showIcons && styles.inputWithIcons]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChange}
          multiline
          maxLength={1000}
        />
        {showIcons && (
          <View style={styles.iconsInside}>
            {onImagePress && (
              <TouchableOpacity onPress={onImagePress} disabled={imageLoading} activeOpacity={0.7}>
                {imageLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="camera-outline" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
            {onLocationPress && (
              <TouchableOpacity onPress={onLocationPress} disabled={locationLoading} activeOpacity={0.7}>
                <Ionicons name="location-outline" size={22} color={locationLoading ? Colors.textMuted : Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

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
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  inputWithIcons: {
    paddingRight: Spacing.xs,
  },
  iconsInside: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
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
