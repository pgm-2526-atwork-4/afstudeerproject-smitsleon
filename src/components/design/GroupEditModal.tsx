import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 50;

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  onChangeTitle: (text: string) => void;
  description: string;
  onChangeDescription: (text: string) => void;
  maxMembers: number;
  onChangeMaxMembers: (value: number) => void;
  currentMemberCount: number;
  onSave: () => void;
  saving: boolean;
}

export function GroupEditModal({
  visible,
  onClose,
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  maxMembers,
  onChangeMaxMembers,
  currentMemberCount,
  onSave,
  saving,
}: Props) {
  const minAllowed = Math.max(MIN_MEMBERS, currentMemberCount);

  function handleSave() {
    if (!title.trim()) {
      Alert.alert('Verplicht veld', 'Geef de groep een naam.');
      return;
    }
    if (maxMembers < currentMemberCount) {
      Alert.alert('Ongeldig', `Er zijn al ${currentMemberCount} leden. Maximum kan niet lager zijn.`);
      return;
    }
    onSave();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Groep aanpassen</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Naam van de groep *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={onChangeTitle}
            placeholder="bijv. Pit crew front row"
            placeholderTextColor={Colors.textMuted}
            maxLength={60}
          />

          <Text style={styles.inputLabel}>Beschrijving</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={onChangeDescription}
            placeholder="Vertel iets over jullie groep..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            maxLength={200}
          />

          <Text style={styles.inputLabel}>Maximum aantal leden</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={[styles.counterBtn, maxMembers <= minAllowed && styles.counterBtnDisabled]}
              onPress={() => onChangeMaxMembers(Math.max(minAllowed, maxMembers - 1))}
              disabled={maxMembers <= minAllowed}
            >
              <Ionicons name="remove" size={20} color={maxMembers <= minAllowed ? Colors.textMuted : Colors.text} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{maxMembers}</Text>
            <TouchableOpacity
              style={[styles.counterBtn, maxMembers >= MAX_MEMBERS && styles.counterBtnDisabled]}
              onPress={() => onChangeMaxMembers(Math.min(MAX_MEMBERS, maxMembers + 1))}
              disabled={maxMembers >= MAX_MEMBERS}
            >
              <Ionicons name="add" size={20} color={maxMembers >= MAX_MEMBERS ? Colors.textMuted : Colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <Text style={styles.saveButtonText}>Opslaan</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    alignSelf: 'center',
    marginVertical: Spacing.sm,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterBtnDisabled: {
    opacity: 0.4,
  },
  counterValue: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
