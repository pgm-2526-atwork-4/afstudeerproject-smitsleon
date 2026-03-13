import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  joined_at: string;
  role: 'admin' | 'member';
}

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
  const [meetingLat, setMeetingLat] = useState<number | null>(null);
  const [meetingLng, setMeetingLng] = useState<number | null>(null);
  const [meetingName, setMeetingName] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickerCoord, setPickerCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [savingMeetingPoint, setSavingMeetingPoint] = useState(false);

  // Editable group data (fetched from DB, falls back to params)
  const [groupTitle, setGroupTitle] = useState(params.title ?? '');
  const [groupDescription, setGroupDescription] = useState(params.description ?? '');
  const [groupMaxMembers, setGroupMaxMembers] = useState(parseInt(params.max_members, 10) || 6);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxMembers, setEditMaxMembers] = useState(6);
  const [savingEdit, setSavingEdit] = useState(false);
  const MIN_MEMBERS = 2;
  const MAX_MEMBERS = 50;

  const isAdmin = members.some((m) => m.user_id === user?.id && m.role === 'admin');
  const isMember = members.some((m) => m.user_id === user?.id);
  const adminCount = members.filter((m) => m.role === 'admin').length;
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
        (data ?? []).map((row: any) => ({
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
    // Fetch group data from DB to have latest values
    supabase
      .from('groups')
      .select('title, description, max_members, meeting_point_lat, meeting_point_lng, meeting_point_name')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setGroupTitle(data.title ?? params.title ?? '');
          setGroupDescription(data.description ?? '');
          setGroupMaxMembers(data.max_members ?? 6);
          if (data.meeting_point_lat && data.meeting_point_lng) {
            setMeetingLat(data.meeting_point_lat);
            setMeetingLng(data.meeting_point_lng);
            setMeetingName(data.meeting_point_name ?? '');
          }
        }
      });
  }, [fetchMembers]);

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
              content: `${displayName} heeft de groep verlaten`,
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
        content: `${displayName} heeft zich aangesloten bij de groep`,
      });
      await fetchMembers();
    }
    setJoining(false);
  }

  async function openMapPicker() {
    let coord = pickerCoord;
    if (meetingLat && meetingLng) {
      coord = { latitude: meetingLat, longitude: meetingLng };
    } else {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await ExpoLocation.getCurrentPositionAsync({});
          coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      } catch {}
    }
    if (!coord) coord = { latitude: 50.8503, longitude: 4.3517 };
    setPickerCoord(coord);
    setShowMapPicker(true);
  }

  async function handleSaveMeetingPoint() {
    if (!pickerCoord) return;
    setSavingMeetingPoint(true);

    let name = '';
    try {
      const results = await ExpoLocation.reverseGeocodeAsync(pickerCoord);
      if (results[0]) {
        const r = results[0];
        name = [r.name, r.street, r.city].filter(Boolean).join(', ');
      }
    } catch {}
    if (!name) name = `${pickerCoord.latitude.toFixed(4)}, ${pickerCoord.longitude.toFixed(4)}`;

    const { error } = await supabase
      .from('groups')
      .update({
        meeting_point_lat: pickerCoord.latitude,
        meeting_point_lng: pickerCoord.longitude,
        meeting_point_name: name,
      })
      .eq('id', params.id);

    if (error) {
      Alert.alert('Fout', 'Opslaan mislukt. Probeer opnieuw.');
    } else {
      setMeetingLat(pickerCoord.latitude);
      setMeetingLng(pickerCoord.longitude);
      setMeetingName(name);
      setShowMapPicker(false);
    }
    setSavingMeetingPoint(false);
  }

  function openMeetingPointInMaps() {
    if (!meetingLat || !meetingLng) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${meetingLat},${meetingLng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${meetingLat},${meetingLng}`,
    });
    Linking.openURL(url!);
  }

  function openEditModal() {
    setEditTitle(groupTitle);
    setEditDescription(groupDescription);
    setEditMaxMembers(groupMaxMembers);
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      Alert.alert('Verplicht veld', 'Geef de groep een naam.');
      return;
    }
    if (editMaxMembers < memberCount) {
      Alert.alert('Ongeldig', `Er zijn al ${memberCount} leden. Maximum kan niet lager zijn.`);
      return;
    }
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
                content: `${member.first_name} is verwijderd uit de groep door ${adminName}`,
              });
              await fetchMembers();
            }
          },
        },
      ],
    );
  }

  const initials = (m: Member) =>
    `${m.first_name.charAt(0)}${m.last_name.charAt(0)}`.toUpperCase();

  const eventDate = params.event_date ? new Date(params.event_date) : null;
  const hasTime = eventDate ? eventDate.getUTCHours() !== 0 || eventDate.getUTCMinutes() !== 0 : false;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        {/* Header image */}
        <View style={styles.imageWrapper}>
          {params.event_image_url ? (
            <Image source={{ uri: params.event_image_url }} style={styles.headerImage} />
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

          {/* Settings button — admin only */}
          {isAdmin && (
            <TouchableOpacity style={styles.settingsButton} onPress={openEditModal}>
              <Ionicons name="settings-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
          )}

          {/* Group title on image */}
          <View style={styles.imageTitleWrapper}>
            <Text style={styles.groupName}>{groupTitle}</Text>
            <Text style={styles.concertName}>{params.event_name}</Text>
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
            {eventDate ? (
              <View style={styles.concertRow}>
                <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
                <Text style={styles.concertDetail}>
                  {eventDate.toLocaleDateString('nl-BE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            ) : null}
            {eventDate ? (
              <View style={styles.concertRow}>
                <Ionicons name="time-outline" size={15} color={Colors.primary} />
                <Text style={styles.concertDetail}>
                  {hasTime
                    ? eventDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
                    : 'Tijd nog onbekend'}
                </Text>
              </View>
            ) : null}
            {params.event_location ? (
              <View style={styles.concertRow}>
                <Ionicons name="location-outline" size={15} color={Colors.primary} />
                <Text style={styles.concertDetail}>{params.event_location}</Text>
              </View>
            ) : null}
          </View>

          {/* Meeting point — only visible for members */}
          {isMember && (
            <View style={styles.concertCard}>
              <View style={styles.meetingPointHeader}>
                <Text style={styles.sectionLabel}>Meeting Point</Text>
                {isAdmin && (
                  <TouchableOpacity onPress={openMapPicker} hitSlop={8}>
                    <Ionicons
                      name={meetingLat ? 'create-outline' : 'add-circle-outline'}
                      size={18}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {meetingLat && meetingLng ? (
                <>
                  <View style={styles.mapPreviewWrapper}>
                    <MapView
                      style={styles.mapPreview}
                      region={{
                        latitude: meetingLat,
                        longitude: meetingLng,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                    >
                      <Marker coordinate={{ latitude: meetingLat, longitude: meetingLng }} />
                    </MapView>
                  </View>
                  <TouchableOpacity
                    style={styles.concertRow}
                    onPress={openMeetingPointInMaps}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="navigate-outline" size={15} color={Colors.primary} />
                    <Text style={[styles.concertDetail, { color: Colors.primary }]}>{meetingName}</Text>
                    <Ionicons name="open-outline" size={13} color={Colors.textMuted} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.concertRow}>
                  <Ionicons name="navigate-outline" size={15} color={Colors.textMuted} />
                  <Text style={[styles.concertDetail, { fontStyle: 'italic' }]}>
                    {isAdmin
                      ? 'Tik op + om een meeting point te kiezen op de kaart'
                      : 'Nog geen meeting point ingesteld'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Members section */}
        <View style={styles.membersSection}>
          <View style={styles.membersSectionHeader}>
            <Text style={styles.sectionTitle}>Leden</Text>
            <Text style={styles.memberCountLabel}>{memberCount} / {maxMembers}</Text>
          </View>

          {loadingMembers ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
          ) : (
            members.map((member) => {
              const isMemberAdmin = member.role === 'admin';
              const isCurrentUser = member.user_id === user?.id;
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
                  onLongPress={canManage ? () => handleMemberAction(member) : undefined}
                >
                  {/* Avatar */}
                  {member.avatar_url ? (
                    <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>{initials(member)}</Text>
                    </View>
                  )}

                  {/* Name */}
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.first_name} {member.last_name}
                      {isCurrentUser ? ' (jij)' : ''}
                    </Text>
                  </View>

                  {/* Admin badge */}
                  {isMemberAdmin && (
                    <View style={styles.memberAdminBadge}>
                      <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                      <Text style={styles.memberAdminBadgeText}>Beheerder</Text>
                    </View>
                  )}

                  {/* Admin action button */}
                  {canManage ? (
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => handleMemberAction(member)}
                    >
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

      {/* Map picker modal */}
      <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMapPicker(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Meeting Point</Text>
            <TouchableOpacity
              onPress={handleSaveMeetingPoint}
              disabled={!pickerCoord || savingMeetingPoint}
              hitSlop={8}
            >
              {savingMeetingPoint ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.modalSaveText,
                    !pickerCoord && { color: Colors.textMuted },
                  ]}
                >
                  Opslaan
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>Tik op de kaart om een meeting point te kiezen</Text>
          <MapView
            style={styles.modalMap}
            initialRegion={{
              latitude: pickerCoord?.latitude ?? 50.8503,
              longitude: pickerCoord?.longitude ?? 4.3517,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={(e) => setPickerCoord(e.nativeEvent.coordinate)}
          >
            {pickerCoord && (
              <Marker
                coordinate={pickerCoord}
                draggable
                onDragEnd={(e) => setPickerCoord(e.nativeEvent.coordinate)}
              />
            )}
          </MapView>
        </SafeAreaView>
      </Modal>

      {/* Edit group modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Groep aanpassen</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Naam van de groep *</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="bijv. Pit crew front row"
              placeholderTextColor={Colors.textMuted}
              maxLength={60}
            />

            <Text style={styles.inputLabel}>Beschrijving</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Vertel iets over jullie groep..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            <Text style={styles.inputLabel}>Maximum aantal leden</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={[styles.counterBtn, editMaxMembers <= Math.max(MIN_MEMBERS, memberCount) && styles.counterBtnDisabled]}
                onPress={() => setEditMaxMembers((v) => Math.max(Math.max(MIN_MEMBERS, memberCount), v - 1))}
                disabled={editMaxMembers <= Math.max(MIN_MEMBERS, memberCount)}
              >
                <Ionicons name="remove" size={20} color={editMaxMembers <= Math.max(MIN_MEMBERS, memberCount) ? Colors.textMuted : Colors.text} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{editMaxMembers}</Text>
              <TouchableOpacity
                style={[styles.counterBtn, editMaxMembers >= MAX_MEMBERS && styles.counterBtnDisabled]}
                onPress={() => setEditMaxMembers((v) => Math.min(MAX_MEMBERS, v + 1))}
                disabled={editMaxMembers >= MAX_MEMBERS}
              >
                <Ionicons name="add" size={20} color={editMaxMembers >= MAX_MEMBERS ? Colors.textMuted : Colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, savingEdit && styles.saveButtonDisabled]}
              onPress={handleSaveEdit}
              disabled={savingEdit}
            >
              {savingEdit ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.saveButtonText}>Opslaan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
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
    backgroundColor: '#8B1A1A',
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
  mapPreviewWrapper: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  mapPreview: {
    height: 160,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  modalSaveText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  modalHint: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  modalMap: {
    flex: 1,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
    gap: Spacing.sm,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  editModalTitle: {
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
