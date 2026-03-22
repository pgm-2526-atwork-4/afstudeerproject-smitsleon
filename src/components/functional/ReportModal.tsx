import { supabase } from '@/core/lib/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'ongepast_gedrag', label: 'Ongepast gedrag' },
  { value: 'nep_profiel', label: 'Nep profiel' },
  { value: 'intimidatie', label: 'Intimidatie' },
  { value: 'andere', label: 'Andere' },
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reporterId: string;
  reportedUserId: string;
}

export function ReportModal({ visible, onClose, reporterId, reportedUserId }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setSending(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      description: description.trim() || null,
    });
    setSending(false);
    setReason('');
    setDescription('');
    onClose();
    if (error) Alert.alert('Fout', 'Kon melding niet versturen.');
    else Alert.alert('Bedankt', 'Je melding is verstuurd en wordt door ons bekeken.');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modal}>
                <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={styles.title}>Gebruiker rapporteren</Text>
                  <Text style={styles.subtitle}>Waarom wil je deze gebruiker melden?</Text>
                  {REPORT_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.reasonOption, reason === r.value && styles.reasonSelected]}
                      onPress={() => setReason(r.value)}
                    >
                      <Text style={[styles.reasonText, reason === r.value && styles.reasonTextSelected]}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TextInput
                    style={styles.input}
                    placeholder="Extra toelichting (optioneel)"
                    placeholderTextColor={Colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[styles.submitBtn, !reason && styles.submitDisabled]}
                    onPress={handleSubmit}
                    disabled={!reason || sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color={Colors.text} />
                    ) : (
                      <Text style={styles.submitText}>Versturen</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.xl, width: '85%', maxHeight: '80%', borderWidth: 1, borderColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.xs },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.md },
  reasonOption: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xs },
  reasonSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(29, 185, 84, 0.15)' },
  reasonText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  reasonTextSelected: { color: Colors.primary, fontWeight: '600' },
  input: { color: Colors.text, fontSize: FontSizes.sm, backgroundColor: Colors.background, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginTop: Spacing.md, minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
});
