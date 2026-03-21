import { GroupEditModal } from '@/components/design/GroupEditModal';
import { MeetingPointModal } from '@/components/design/MeetingPointModal';
import { Member, MembersList } from '@/components/design/MembersList';
import { useAuth } from '@/core/AuthContext';
import { DbGroupWithEvent, GroupMemberUserId, GroupMemberWithUser } from '@/core/database.types';
import { notifyUsers } from '@/core/pushNotifications';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    description: string;
    max_members: string;
    created_by: string;
    event_id: string;
    event_name: string;
    event_image_url: string;
    event_date: string;
    event_location: string;
  }>();

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [showMeetingPointModal, setShowMeetingPointModal] = useState(false);
  const [editMeetingName, setEditMeetingName] = useState('');
  const [savingMeetingPoint, setSavingMeetingPoint] = useState(false);

  // Editable group data (fetched from DB, falls back to params)
  const [groupTitle, setGroupTitle] = useState(params.title ?? '');
  const [groupDescription, setGroupDescription] = useState(params.description ?? '');
  const [groupMaxMembers, setGroupMaxMembers] = useState(parseInt(params.max_members, 10) || 6);

  // Event data (fetched from DB when params are missing, e.g. deep link)
  const [eventName, setEventName] = useState(params.event_name ?? '');
  const [eventImageUrl, setEventImageUrl] = useState(params.event_image_url ?? '');
  const [eventDate, setEventDate] = useState(params.event_date ?? '');
  const [eventLocation, setEventLocation] = useState(params.event_location ?? '');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxMembers, setEditMaxMembers] = useState(6);
  const [savingEdit, setSavingEdit] = useState(false);

  const isAdmin = useMemo(() => members.some((m) => m.user_id === user?.id && m.role === 'admin'), [members, user?.id]);
  const isMember = useMemo(() => members.some((m) => m.user_id === user?.id), [members, user?.id]);
  const adminCount = useMemo(() => members.filter((m) => m.role === 'admin').length, [members]);
  const memberCount = members.length;
  const maxMembers = groupMaxMembers;
  const isFull = memberCount >= maxMembers;

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        joined_at,
        role,
        users (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('group_id', params.id)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(
        ((data ?? []) as unknown as GroupMemberWithUser[]).map((row) => ({
          user_id: row.user_id,
          joined_at: row.joined_at,
          role: row.role ?? 'member',
          first_name: row.users?.first_name ?? '',
          last_name: row.users?.last_name ?? '',
          avatar_url: row.users?.avatar_url ?? null,
        }))
      );
    }
    setLoadingMembers(false);
  }, [params.id]);

  useEffect(() => {
    fetchMembers();
    // Fetch group + event data from DB to have latest values (also supports deep link opens)
    supabase
      .from('groups')
      .select(`
        title, description, max_members, meeting_point_name,
        events ( id, name, image_url, date, location_name, city )
      `)
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setGroupTitle(data.title ?? params.title ?? '');
          setGroupDescription(data.description ?? '');
          setGroupMaxMembers(data.max_members ?? 6);
          setMeetingName(data.meeting_point_name ?? '');

          const ev = (data as unknown as DbGroupWithEvent).events;
          if (ev) {
            if (!params.event_name) setEventName(ev.name ?? '');
            if (!params.event_image_url) setEventImageUrl(ev.image_url ?? '');
            if (!params.event_date) setEventDate(ev.date ?? '');
            if (!params.event_location) {
              const loc = [ev.location_name, ev.city].filter(Boolean).join(', ');
              setEventLocation(loc);
            }
          }
        }
      });
  }, [fetchMembers, params.id, params.title, params.event_name, params.event_image_url, params.event_date, params.event_location]);

  async function handleLeaveGroup() {
    if (!user) return;

    // Admin who is the only admin: must delete group or promote someone first
    const isLastAdmin = isAdmin && adminCount <= 1;

    const title = isLastAdmin ? 'Groep verwijderen' : 'Groep verlaten';
    const message = isLastAdmin
      ? 'Jij bent de enige beheerder. Als je de groep verlaat, wordt de groep verwijderd voor alle leden. Je kan ook eerst iemand anders tot beheerder benoemen.'
      : 'Weet je zeker dat je de groep wilt verlaten?';
    const confirmText = isLastAdmin ? 'Verwijderen' : 'Verlaten';

    Alert.alert(title, message, [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: async () => {
          setLeaving(true);
          if (isLastAdmin) {
            await supabase.from('group_members').delete().eq('group_id', params.id);
            // No system message needed — group is being deleted
            const { error } = await supabase.from('groups').delete().eq('id', params.id);
            if (error) {
              Alert.alert('Fout', 'Groep verwijderen mislukt. Probeer opnieuw.');
              setLeaving(false);
              return;
            }
          } else {
            const displayName = profile?.first_name || 'Iemand';
            // Insert system message BEFORE deleting membership (RLS requires membership)
            await supabase.from('messages').insert({
              group_id: params.id,
              user_id: user.id,
              content: `[sys] ${displayName} heeft de groep verlaten`,
            });
            const { error } = await supabase
              .from('group_members')
              .delete()
              .eq('group_id', params.id)
              .eq('user_id', user.id);
            if (error) {
              Alert.alert('Fout', 'Verlaten mislukt. Probeer opnieuw.');
              setLeaving(false);
              return;
            }
          }
          setLeaving(false);
          router.back();
        },
      },
    ]);
  }

  async function handleJoinGroup() {
    if (!user) {
      Alert.alert('Niet ingelogd', 'Log in om deel te nemen aan een groep.');
      return;
    }
    if (isFull) {
      Alert.alert('Groep vol', 'Deze groep heeft het maximale aantal leden bereikt.');
      return;
    }
    setJoining(true);
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: params.id, user_id: user.id });
    if (error) {
      Alert.alert('Fout', 'Deelnemen mislukt. Probeer opnieuw.');
    } else {
      const displayName = profile?.first_name || 'Iemand';
      await supabase.from('messages').insert({
        group_id: params.id,
        user_id: user.id,
        content: `[sys] ${displayName} heeft zich aangesloten bij de groep`,
      });
      // Notify all existing members
      const { data: existingMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', params.id)
        .neq('user_id', user.id);
      if (existingMembers && existingMembers.length > 0) {
        const joinerName = profile
          ? `${profile.first_name} ${profile.last_name}`.trim()
          : 'Iemand';
        await notifyUsers(
          existingMembers.map((m: GroupMemberUserId) => ({
            user_id: m.user_id,
            type: 'group_joined',
            title: groupTitle,
            body: `${joinerName} heeft zich aangesloten bij de groep "${groupTitle}"`,
            data: { group_id: params.id, joiner_user_id: user.id, event_id: params.event_id, event_name: params.event_name },
          })),
        );
      }
      await fetchMembers();
    }
    setJoining(false);
  }

  function openMeetingPointEditor() {
    setEditMeetingName(meetingName);
    setShowMeetingPointModal(true);
  }

  async function handleSaveMeetingPoint() {
    const name = editMeetingName.trim();
    setSavingMeetingPoint(true);

    const { error } = await supabase
      .from('groups')
      .update({ meeting_point_name: name || null })
      .eq('id', params.id);

    if (error) {
      Alert.alert('Fout', 'Opslaan mislukt. Probeer opnieuw.');
    } else {
      setMeetingName(name);
      setShowMeetingPointModal(false);
    }
    setSavingMeetingPoint(false);
  }

  function openEditModal() {
    setEditTitle(groupTitle);
    setEditDescription(groupDescription);
    setEditMaxMembers(groupMaxMembers);
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    setSavingEdit(true);
    const { error } = await supabase
      .from('groups')
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        max_members: editMaxMembers,
      })
      .eq('id', params.id);

    if (error) {
      Alert.alert('Fout', 'Opslaan mislukt. Probeer opnieuw.');
    } else {
      setGroupTitle(editTitle.trim());
      setGroupDescription(editDescription.trim());
      setGroupMaxMembers(editMaxMembers);
      setShowEditModal(false);
    }
    setSavingEdit(false);
  }

  function handleMemberAction(member: Member) {
    if (!isAdmin || member.user_id === user?.id) return;

    const actions: { text: string; onPress: () => void; style?: 'destructive' | 'cancel' }[] = [];

    if (member.role === 'admin') {
      actions.push({
        text: 'Beheerder verwijderen',
        onPress: () => handleToggleAdmin(member, 'member'),
      });
    } else {
      actions.push({
        text: 'Maak beheerder',
        onPress: () => handleToggleAdmin(member, 'admin'),
      });
    }

    actions.push({
      text: 'Verwijder uit groep',
      style: 'destructive',
      onPress: () => handleRemoveMember(member),
    });

    actions.push({ text: 'Annuleren', style: 'cancel', onPress: () => {} });

    Alert.alert(
      `${member.first_name} ${member.last_name}`,
      'Kies een actie',
      actions,
    );
  }

  async function handleToggleAdmin(member: Member, newRole: 'admin' | 'member') {
    const { error } = await supabase
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', params.id)
      .eq('user_id', member.user_id);

    if (error) {
      Alert.alert('Fout', 'Rol wijzigen mislukt. Probeer opnieuw.');
    } else {
      await fetchMembers();
    }
  }

  async function handleRemoveMember(member: Member) {
    Alert.alert(
      'Lid verwijderen',
      `Weet je zeker dat je ${member.first_name} ${member.last_name} uit de groep wilt verwijderen?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('group_members')
              .delete()
              .eq('group_id', params.id)
              .eq('user_id', member.user_id);

            if (error) {
              Alert.alert('Fout', 'Verwijderen mislukt. Probeer opnieuw.');
            } else {
              const adminName = profile?.first_name || 'Een beheerder';
              await supabase.from('messages').insert({
                group_id: params.id,
                user_id: user!.id,
                content: `[sys] ${member.first_name} is verwijderd uit de groep door ${adminName}`,
              });
              await fetchMembers();
            }
          },
        },
      ],
    );
  }

  async function handleShareInvite() {
    const link = Linking.createURL(`/group/${params.id}`);
    try {
      await Share.share({
        message: `Join mijn groep "${groupTitle}" op Concert Buddy! 🎶\n${link}`,
      });
    } catch {
      // user cancelled
    }
  }

  const parsedEventDate = eventDate ? new Date(eventDate) : null;
  const hasTime = parsedEventDate ? parsedEventDate.getUTCHours() !== 0 || parsedEventDate.getUTCMinutes() !== 0 : false;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        {/* Header image */}
        <View style={styles.imageWrapper}>
          {eventImageUrl ? (
            <Image source={{ uri: eventImageUrl }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, styles.headerImagePlaceholder]}>
              <Ionicons name="musical-notes" size={48} color={Colors.textMuted} />
            </View>
          )}
          <View style={styles.imageOverlay} />

          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          {/* Header action buttons */}
          <View style={styles.headerActions}>
            {isMember && (
              <TouchableOpacity style={styles.headerActionButton} onPress={handleShareInvite}>
                <Ionicons name="share-outline" size={22} color={Colors.text} />
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity style={styles.headerActionButton} onPress={openEditModal}>
                <Ionicons name="settings-outline" size={22} color={Colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Group title on image */}
          <View style={styles.imageTitleWrapper}>
            <Text style={styles.groupName}>{groupTitle}</Text>
            <Text style={styles.concertName}>{eventName}</Text>
          </View>
        </View>

        {/* Info section */}
        <View style={styles.infoSection}>
          {/* Description */}
          {groupDescription ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.sectionLabel}>Over deze groep</Text>
              <Text style={styles.descriptionText}>{groupDescription}</Text>
            </View>
          ) : null}

          {/* Concert info */}
          <View style={styles.concertCard}>
            <Text style={styles.sectionLabel}>Info over Concert</Text>
            {parsedEventDate ? (
              <View style={styles.concertRow}>
                <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
                <Text style={styles.concertDetail}>
                  {parsedEventDate.toLocaleDateString('nl-BE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            ) : null}
            {parsedEventDate ? (
              <View style={styles.concertRow}>
                <Ionicons name="time-outline" size={15} color={Colors.primary} />
                <Text style={styles.concertDetail}>
                  {hasTime
                    ? parsedEventDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
                    : 'Tijd nog onbekend'}
                </Text>
              </View>
            ) : null}
            {eventLocation ? (
              <View style={styles.concertRow}>
                <Ionicons name="location-outline" size={15} color={Colors.primary} />
                <Text style={styles.concertDetail}>{eventLocation}</Text>
              </View>
            ) : null}
          </View>

          {/* Meeting point — only visible for members */}
          {isMember && (
            <View style={styles.concertCard}>
              <View style={styles.meetingPointHeader}>
                <Text style={styles.sectionLabel}>Meeting Point</Text>
                {isAdmin && (
                  <TouchableOpacity onPress={openMeetingPointEditor} hitSlop={8}>
                    <Ionicons
                      name={meetingName ? 'create-outline' : 'add-circle-outline'}
                      size={18}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {meetingName ? (
                <View style={styles.concertRow}>
                  <Ionicons name="location-outline" size={15} color={Colors.primary} />
                  <Text style={styles.concertDetail}>{meetingName}</Text>
                </View>
              ) : (
                <View style={styles.concertRow}>
                  <Ionicons name="navigate-outline" size={15} color={Colors.textMuted} />
                  <Text style={[styles.concertDetail, { fontStyle: 'italic' }]}>
                    {isAdmin
                      ? 'Tik op + om een meeting point in te stellen'
                      : 'Nog geen meeting point ingesteld'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Members section */}
        <MembersList
          members={members}
          loading={loadingMembers}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          memberCount={memberCount}
          maxMembers={maxMembers}
          onMemberAction={handleMemberAction}
        />

        {/* Action buttons */}
        <View style={styles.actionSection}>
          {isMember ? (
            <TouchableOpacity
              style={[styles.leaveButton, isAdmin && adminCount <= 1 && styles.deleteButton]}
              onPress={handleLeaveGroup}
              disabled={leaving}
            >
              {leaving ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isAdmin && adminCount <= 1 ? 'trash' : 'log-out-outline'}
                    size={20}
                    color={Colors.text}
                  />
                  <Text style={styles.leaveButtonText}>
                    {isAdmin && adminCount <= 1 ? 'Groep verwijderen' : 'Groep verlaten'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.joinButton, isFull && styles.joinButtonDisabled]}
              onPress={handleJoinGroup}
              disabled={joining || isFull}
            >
              {joining ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color={Colors.text} />
                  <Text style={styles.joinButtonText}>
                    {isFull ? 'Groep is vol' : 'Deelnemen'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Meeting point modal */}
      <MeetingPointModal
        visible={showMeetingPointModal}
        onClose={() => setShowMeetingPointModal(false)}
        value={editMeetingName}
        onChangeText={setEditMeetingName}
        onSave={handleSaveMeetingPoint}
        saving={savingMeetingPoint}
      />

      {/* Edit group modal */}
      <GroupEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editTitle}
        onChangeTitle={setEditTitle}
        description={editDescription}
        onChangeDescription={setEditDescription}
        maxMembers={editMaxMembers}
        onChangeMaxMembers={setEditMaxMembers}
        currentMemberCount={memberCount}
        onSave={handleSaveEdit}
        saving={savingEdit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  imageWrapper: { position: 'relative', height: 280 },
  headerImage: { width: '100%', height: '100%' },
  headerImagePlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  headerActions: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerActionButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  imageTitleWrapper: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    gap: 4,
  },
  groupName: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: 'bold',
  },
  concertName: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.sm,
  },
  infoSection: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  descriptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  descriptionText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  concertCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  concertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  concertDetail: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  actionSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    opacity: 0.9,
  },
  deleteButton: {
    backgroundColor: Colors.dangerDark,
  },
  leaveButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
  },
  joinButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  joinButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  meetingPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
