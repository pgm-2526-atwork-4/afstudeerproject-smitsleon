import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Group } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ConcertDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    date: string;
    time: string;
    venue: string;
    city: string;
    imageUrl: string;
    url: string;
  }>();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMaxMembers, setGroupMaxMembers] = useState('6');
  const [creating, setCreating] = useState(false);

  async function upsertEvent() {
    await supabase.from('events').upsert({
      id: params.id,
      name: params.name,
      date: params.date ? new Date(params.date).toISOString() : null,
      location_name: params.venue ? `${params.venue}, ${params.city}` : null,
      image_url: params.imageUrl || null,
    }, { onConflict: 'id' });
  }

  const fetchGroups = useCallback(async () => {
    if (!params.id) return;
    setLoadingGroups(true);

    const { data, error } = await supabase
      .from('groups')
      .select(`*, member_count:group_members(count)`)
      .eq('event_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching groups:', error);
      setLoadingGroups(false);
      return;
    }

    if (user && data && data.length > 0) {
      const groupIds = data.map((g: any) => g.id);
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .in('group_id', groupIds);

      const memberGroupIds = new Set((memberships ?? []).map((m: any) => m.group_id));

      setGroups(data.map((g: any) => ({
        ...g,
        member_count: g.member_count?.[0]?.count ?? 0,
        is_member: memberGroupIds.has(g.id),
      })));
    } else {
      setGroups((data ?? []).map((g: any) => ({
        ...g,
        member_count: g.member_count?.[0]?.count ?? 0,
        is_member: false,
      })));
    }

    setLoadingGroups(false);
  }, [params.id, user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function handleCreateGroup() {
    if (!user) { Alert.alert('Niet ingelogd', 'Log in om een groep aan te maken.'); return; }
    if (!groupTitle.trim()) { Alert.alert('Verplicht veld', 'Geef je groep een naam.'); return; }
    const maxMembers = parseInt(groupMaxMembers, 10);
    if (isNaN(maxMembers) || maxMembers < 2 || maxMembers > 50) {
      Alert.alert('Ongeldig getal', 'Maximum leden moet tussen 2 en 50 liggen.');
      return;
    }
    setCreating(true);
    try {
      await upsertEvent();
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ event_id: params.id, created_by: user.id, title: groupTitle.trim(), description: groupDescription.trim() || null, max_members: maxMembers })
        .select()
        .single();
      if (groupError || !group) { Alert.alert('Fout', 'Groep aanmaken mislukt. Probeer opnieuw.'); setCreating(false); return; }
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
      setGroupTitle(''); setGroupDescription(''); setGroupMaxMembers('6');
      setModalVisible(false);
      await fetchGroups();
    } catch { Alert.alert('Fout', 'Er is een onverwachte fout opgetreden.'); }
    finally { setCreating(false); }
  }

  async function handleJoinGroup(group: Group) {
    if (!user) { Alert.alert('Niet ingelogd', 'Log in om deel te nemen aan een groep.'); return; }
    if (group.is_member) return;
    const memberCount = typeof group.member_count === 'number' ? group.member_count : 0;
    if (memberCount >= group.max_members) { Alert.alert('Groep vol', 'Deze groep heeft het maximale aantal leden bereikt.'); return; }
    setJoiningGroupId(group.id);
    const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
    if (error) Alert.alert('Fout', 'Deelnemen mislukt. Probeer opnieuw.');
    else await fetchGroups();
    setJoiningGroupId(null);
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header image */}
        <View style={styles.imageWrapper}>
          {params.imageUrl ? (
            <Image source={{ uri: params.imageUrl }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, { backgroundColor: Colors.surface }]} />
          )}
          <View style={styles.imageOverlay} />
          <Text style={styles.artistName}>{params.name}</Text>

          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Event info */}
        <View style={styles.infoSection}>
          <Text style={styles.tourName}>{params.name}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>{params.date}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>{params.time || 'Tijd nog onbekend'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>{params.venue}, {params.city}</Text>
          </View>
        </View>

        {/* Tickets button */}
        {params.url ? (
          <TouchableOpacity
            style={styles.ticketButton}
            onPress={() => Linking.openURL(params.url)}
          >
            <Text style={styles.ticketButtonText}>Tickets kopen</Text>
            <Ionicons name="open-outline" size={16} color={Colors.text} />
          </TouchableOpacity>
        ) : null}

        {/* Groups section */}
        <View style={styles.groupsSection}>
          <View style={styles.groupsHeader}>
            <Text style={styles.groupsTitle}>Groepen</Text>
            <TouchableOpacity style={styles.newGroupButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={18} color={Colors.text} />
              <Text style={styles.newGroupButtonText}>Nieuwe groep</Text>
            </TouchableOpacity>
          </View>

          {loadingGroups ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : groups.length === 0 ? (
            <Text style={styles.emptyGroups}>Nog geen groepen voor dit event. Maak er een aan!</Text>
          ) : (
            groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: '/group/[id]',
                    params: {
                      id: group.id,
                      title: group.title,
                      description: group.description ?? '',
                      max_members: String(group.max_members),
                      created_by: group.created_by,
                      event_id: params.id,
                      event_name: params.name,
                      event_image_url: params.imageUrl ?? '',
                      event_date: params.date ?? '',
                      event_location: params.venue ? `${params.venue}, ${params.city}` : '',
                    },
                  })
                }
              >
                <View style={styles.groupCardHeader}>
                  <Text style={styles.groupCardTitle} numberOfLines={1}>{group.title}</Text>
                  {group.created_by === user?.id && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                      <Text style={styles.adminBadgeText}>Beheerder</Text>
                    </View>
                  )}
                </View>
                {group.description ? (
                  <Text style={styles.groupCardDesc} numberOfLines={2}>{group.description}</Text>
                ) : null}
                <View style={styles.groupCardFooter}>
                  <View style={styles.memberCount}>
                    <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.memberCountText}>{group.member_count} / {group.max_members} leden</Text>
                  </View>
                  {group.is_member ? (
                    <View style={styles.joinedBadge}>
                      <Ionicons name="checkmark" size={14} color={Colors.primary} />
                      <Text style={styles.joinedBadgeText}>Lid</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.joinButton, (group.member_count ?? 0) >= group.max_members && styles.joinButtonDisabled]}
                      onPress={(e) => { e.stopPropagation(); handleJoinGroup(group); }}
                      disabled={(group.member_count ?? 0) >= group.max_members || joiningGroupId === group.id}
                    >
                      {joiningGroupId === group.id
                        ? <ActivityIndicator size="small" color={Colors.text} />
                        : <Text style={styles.joinButtonText}>{(group.member_count ?? 0) >= group.max_members ? 'Vol' : 'Deelnemen'}</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nieuwe groep aanmaken</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Naam van de groep *</Text>
            <TextInput style={styles.input} value={groupTitle} onChangeText={setGroupTitle} placeholder="bijv. Pit crew front row" placeholderTextColor={Colors.textMuted} maxLength={60} />
            <Text style={styles.inputLabel}>Beschrijving</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} value={groupDescription} onChangeText={setGroupDescription} placeholder="Vertel iets over jullie groep..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} maxLength={200} />
            <Text style={styles.inputLabel}>Maximum aantal leden</Text>
            <TextInput style={styles.input} value={groupMaxMembers} onChangeText={setGroupMaxMembers} keyboardType="number-pad" placeholder="6" placeholderTextColor={Colors.textMuted} maxLength={2} />
            <TouchableOpacity style={[styles.createButton, creating && styles.createButtonDisabled]} onPress={handleCreateGroup} disabled={creating}>
              {creating ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.createButtonText}>Groep aanmaken</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  imageWrapper: {
    position: 'relative',
    height: 300,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  artistName: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    color: Colors.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  infoSection: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  tourName: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.sm,
  },
  ticketButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  groupsSection: {
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  groupsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  groupsTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  newGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  newGroupButtonText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  emptyGroups: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center', marginTop: Spacing.xl },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  groupCardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', flex: 1 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  adminBadgeText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
  groupCardDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  groupCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs },
  memberCount: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  memberCountText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    minWidth: 90,
    alignItems: 'center',
  },
  joinButtonDisabled: { backgroundColor: Colors.surfaceLight },
  joinButtonText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: 'bold' },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  joinedBadgeText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: 'bold' },
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
});
