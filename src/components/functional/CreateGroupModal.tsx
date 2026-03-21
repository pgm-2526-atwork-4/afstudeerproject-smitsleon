import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
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

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string, maxMembers: number) => Promise<void>;
}

export function CreateGroupModal({ visible, onClose, onCreate }: CreateGroupModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState(6);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      await onCreate(title, description, maxMembers);
      setTitle('');
      setDescription('');
      setMaxMembers(6);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nieuwe groep aanmaken</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>Naam van de groep *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="bijv. Pit crew front row" placeholderTextColor={Colors.textMuted} maxLength={60} />
          <Text style={styles.inputLabel}>Beschrijving</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} value={description} onChangeText={setDescription} placeholder="Vertel iets over jullie groep..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} maxLength={200} />
          <Text style={styles.inputLabel}>Maximum aantal leden</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={[styles.counterBtn, maxMembers <= MIN_MEMBERS && styles.counterBtnDisabled]}
              onPress={() => setMaxMembers((v) => Math.max(MIN_MEMBERS, v - 1))}
              disabled={maxMembers <= MIN_MEMBERS}
            >
              <Ionicons name="remove" size={20} color={maxMembers <= MIN_MEMBERS ? Colors.textMuted : Colors.text} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{maxMembers}</Text>
            <TouchableOpacity
              style={[styles.counterBtn, maxMembers >= MAX_MEMBERS && styles.counterBtnDisabled]}
              onPress={() => setMaxMembers((v) => Math.min(MAX_MEMBERS, v + 1))}
              disabled={maxMembers >= MAX_MEMBERS}
            >
              <Ionicons name="add" size={20} color={maxMembers >= MAX_MEMBERS ? Colors.textMuted : Colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.createButton, creating && styles.createButtonDisabled]} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.createButtonText}>Groep aanmaken</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  inputLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.sm,
    color: Colors.text,
    fontSize: FontSizes.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: Spacing.sm },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: { opacity: 0.4 },
  counterValue: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    minWidth: 32,
    textAlign: 'center',
  },
});
