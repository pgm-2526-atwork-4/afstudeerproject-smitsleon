import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  joined_at: string;
  role: 'admin' | 'member';
}

interface Props {
  members: Member[];
  loading: boolean;
  currentUserId: string | undefined;
  isAdmin: boolean;
  memberCount: number;
  maxMembers: number;
  onMemberAction: (member: Member) => void;
}

function getInitials(member: Member) {
  return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
}

export function MembersList({
  members,
  loading,
  currentUserId,
  isAdmin,
  memberCount,
  maxMembers,
  onMemberAction,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.membersSection}>
      <View style={styles.membersSectionHeader}>
        <Text style={styles.sectionTitle}>Leden</Text>
        <Text style={styles.memberCountLabel}>{memberCount} / {maxMembers}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
      ) : (
        members.map((member) => {
          const isMemberAdmin = member.role === 'admin';
          const isCurrentUser = member.user_id === currentUserId;
          const canManage = isAdmin && !isCurrentUser;
          return (
            <TouchableOpacity
              key={member.user_id}
              style={styles.memberRow}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/user/[id]',
                  params: { id: member.user_id },
                })
              }
              onLongPress={canManage ? () => onMemberAction(member) : undefined}
            >
              {member.avatar_url ? (
                <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getInitials(member)}</Text>
                </View>
              )}

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.first_name} {member.last_name}
                  {isCurrentUser ? ' (jij)' : ''}
                </Text>
              </View>

              {isMemberAdmin && (
                <View style={styles.memberAdminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                  <Text style={styles.memberAdminBadgeText}>Beheerder</Text>
                </View>
              )}

              {canManage ? (
                <TouchableOpacity hitSlop={8} onPress={() => onMemberAction(member)}>
                  <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  membersSection: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  memberCountLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLight,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  memberInfo: { flex: 1 },
  memberName: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  memberAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  memberAdminBadgeText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
