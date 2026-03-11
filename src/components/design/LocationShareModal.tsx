import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onShareCurrent: () => void;
  onShareLive: (minutes: number) => void;
  isSharing?: boolean;
  onStopSharing?: () => void;
}

export function LocationShareModal({
  visible,
  onClose,
  onShareCurrent,
  onShareLive,
  isSharing,
  onStopSharing,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {isSharing ? (
            <TouchableOpacity
              style={styles.option}
              onPress={() => { onClose(); onStopSharing?.(); }}
            >
              <View style={[styles.iconCircle, { backgroundColor: Colors.error + '22' }]}>
                <Ionicons name="stop-circle" size={22} color={Colors.error} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Stop met delen</Text>
                <Text style={styles.optionSub}>Je live locatie wordt niet meer gedeeld</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.option} onPress={onShareCurrent}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={22} color={Colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Deel huidige locatie</Text>
                  <Text style={styles.optionSub}>Deel je locatie eenmalig</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Deel live locatie</Text>

              {[
                { label: '15 minuten', minutes: 15 },
                { label: '1 uur', minutes: 60 },
                { label: '5 uur', minutes: 300 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.minutes}
                  style={styles.option}
                  onPress={() => onShareLive(opt.minutes)}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons name="radio" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{opt.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Annuleren</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  optionSub: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  cancelBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLight,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
