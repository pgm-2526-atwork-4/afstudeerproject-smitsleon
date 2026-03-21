import { UserAvatar } from '@/components/design/UserAvatar';
import type { BuddyStatus } from '@/core/hooks/useBuddyConcertStatus';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  buddyStatuses: BuddyStatus[];
}

export function BuddyConcertStatus({ buddyStatuses }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [filter, setFilter] = useState<'going' | 'interested'>('going');

  const goingBuddies = buddyStatuses.filter((b) => b.status === 'going');
  const interestedBuddies = buddyStatuses.filter((b) => b.status === 'interested');

  if (buddyStatuses.length === 0) return null;

  const openModal = (f: 'going' | 'interested') => {
    setFilter(f);
    setVisible(true);
  };

  return (
    <>
      <View style={styles.section}>
        {goingBuddies.length > 0 && (
          <TouchableOpacity style={styles.row} onPress={() => openModal('going')} activeOpacity={0.7}>
            <View style={styles.left}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.text}>
                {goingBuddies.length} {goingBuddies.length === 1 ? 'buddy gaat' : 'buddies gaan'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        {interestedBuddies.length > 0 && (
          <TouchableOpacity style={styles.row} onPress={() => openModal('interested')} activeOpacity={0.7}>
            <View style={styles.left}>
              <Ionicons name="star" size={16} color={Colors.primary} />
              <Text style={styles.text}>
                {interestedBuddies.length} {interestedBuddies.length === 1 ? 'buddy geïnteresseerd' : 'buddies geïnteresseerd'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {filter === 'going' ? 'Buddies die gaan' : 'Geïnteresseerde buddies'}
              </Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterBtn, filter === 'going' && styles.filterBtnActive]}
                onPress={() => setFilter('going')}
              >
                <Text style={[styles.filterBtnText, filter === 'going' && styles.filterBtnTextActive]}>
                  Gaan ({goingBuddies.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterBtn, filter === 'interested' && styles.filterBtnActive]}
                onPress={() => setFilter('interested')}
              >
                <Text style={[styles.filterBtnText, filter === 'interested' && styles.filterBtnTextActive]}>
                  Geïnteresseerd ({interestedBuddies.length})
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={buddyStatuses.filter((b) => b.status === filter)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.buddyRow}
                  onPress={() => { setVisible(false); router.push(`/user/${item.id}`); }}
                  activeOpacity={0.7}
                >
                  <UserAvatar
                    uri={item.avatar_url}
                    initials={`${item.first_name.charAt(0)}${item.last_name.charAt(0)}`}
                    size={36}
                  />
                  <Text style={styles.buddyName}>{item.first_name} {item.last_name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Geen buddies gevonden</Text>
              }
              style={{ maxHeight: 350 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  filterBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: Colors.primary,
  },
  buddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  buddyName: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
