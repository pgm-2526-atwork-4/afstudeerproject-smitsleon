import { LoadingScreen } from '@/components/design/LoadingScreen';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { dbRowToEvent, Event, Group } from '@/core/types';
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
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMaxMembers, setGroupMaxMembers] = useState(6);
  const MIN_MEMBERS = 2;
  const MAX_MEMBERS = 50;
  const [creating, setCreating] = useState(false);
  const [concertStatus, setConcertStatus] = useState<'interested' | 'going' | null>(null);
  const [lineupArtists, setLineupArtists] = useState<{ id: string; name: string; image_url: string | null; genre: string | null }[]>([]);

  // Fetch event data from Supabase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingEvent(true);
      const [eventRes, artistsRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).maybeSingle(),
        supabase.from('event_artists').select('artist_id, artists(id, name, image_url, genre)').eq('event_id', id),
      ]);
      if (!cancelled) {
        setEvent(eventRes.data ? dbRowToEvent(eventRes.data) : null);
        setLineupArtists(
          (artistsRes.data ?? []).map((r: any) => ({
            id: r.artists.id,
            name: r.artists.name,
            image_url: r.artists.image_url,
            genre: r.artists.genre,
          }))
        );
        setLoadingEvent(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Ensure event row exists so FK constraints on groups / concert_status are satisfied.
  // Events are synced from Ticketmaster, so the row should always exist already.
  async function ensureEventExists() {
    if (!event) return;
    const { data } = await supabase.from('events').select('id').eq('id', event.id).maybeSingle();
    if (data) return; // already exists, nothing to do

    // Fallback insert in case the row was somehow deleted
    const dateTimeStr = event.date && event.time
      ? `${event.date}T${event.time}`
      : event.date;
    await supabase.from('events').upsert({
      id: event.id,
      name: event.name,
      date: dateTimeStr ? new Date(dateTimeStr).toISOString() : null,
      location_name: event.venue ?? null,
      image_url: event.imageUrl || null,
      city: event.city || null,
      time: event.time || null,
      url: event.url || null,
    }, { onConflict: 'id' });
  }

  const fetchGroups = useCallback(async () => {
    if (!id) return;
    setLoadingGroups(true);

    const { data, error } = await supabase
      .from('groups')
      .select(`*, member_count:group_members(count)`)
      .eq('event_id', id)
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
  }, [id, user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Fetch current concert status
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('concert_status')
      .select('status')
      .eq('user_id', user.id)
      .eq('event_id', id)
      .maybeSingle()
      .then(({ data }) => {
        setConcertStatus(data?.status as 'interested' | 'going' | null);
      });
  }, [user, id]);

  async function handleSetConcertStatus(status: 'interested' | 'going' | null) {
    if (!user || !id) return;

    if (status === null) {
      // Remove status
      await supabase.from('concert_status').delete().eq('user_id', user.id).eq('event_id', id);
      setConcertStatus(null);
    } else {
      // Ensure event row exists so FK is satisfied
      await ensureEventExists();
      await supabase.from('concert_status').upsert(
        { user_id: user.id, event_id: id, status },
        { onConflict: 'user_id,event_id' }
      );
      setConcertStatus(status);
    }
  }

  async function handleCreateGroup() {
    if (!user) { Alert.alert('Niet ingelogd', 'Log in om een groep aan te maken.'); return; }
    if (!groupTitle.trim()) { Alert.alert('Verplicht veld', 'Geef je groep een naam.'); return; }
    const maxMembers = groupMaxMembers;
    if (maxMembers < 2) {
      Alert.alert('Ongeldig getal', 'Maximum leden moet tussen 2 en 50 liggen.');
      return;
    }
    setCreating(true);
    try {
      await ensureEventExists();
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ event_id: id, created_by: user.id, title: groupTitle.trim(), description: groupDescription.trim() || null, max_members: maxMembers })
        .select()
        .single();
      if (groupError || !group) { Alert.alert('Fout', 'Groep aanmaken mislukt. Probeer opnieuw.'); setCreating(false); return; }
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' });
      setGroupTitle(''); setGroupDescription(''); setGroupMaxMembers(6);
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
    if (error) {
      Alert.alert('Fout', 'Deelnemen mislukt. Probeer opnieuw.');
    } else {
      // Notify all other group members
      const [membersRes, joinerRes] = await Promise.all([
        supabase.from('group_members').select('user_id').eq('group_id', group.id).neq('user_id', user.id),
        supabase.from('users').select('first_name, last_name').eq('id', user.id).single(),
      ]);
      const joinerFirstName = joinerRes.data?.first_name || 'Iemand';
      await supabase.from('messages').insert({
        group_id: group.id,
        user_id: user.id,
        content: ` ${joinerFirstName} heeft zich aangesloten bij de groep`,
      });
      if (membersRes.data && membersRes.data.length > 0) {
        const joinerName = joinerRes.data
          ? `${joinerRes.data.first_name} ${joinerRes.data.last_name}`
          : 'Iemand';
        await supabase.from('notifications').insert(
          membersRes.data.map((m: any) => ({
            user_id: m.user_id,
            type: 'group_joined',
            title: group.title,
            body: `${joinerName} heeft zich aangesloten bij de groep "${group.title}"`,
            data: { group_id: group.id, joiner_user_id: user.id, event_id: id, event_name: event?.name },
          }))
        );
      }
      await fetchGroups();
    }
    setJoiningGroupId(null);
  }

  if (loadingEvent) return <LoadingScreen />;
  if (!event) return (
    <View style={styles.container}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: Colors.textSecondary, fontSize: FontSizes.md }}>Event niet gevonden</Text>
        <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, fontSize: FontSizes.md }}>Ga terug</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header image */}
        <View style={styles.imageWrapper}>
          {event?.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, { backgroundColor: Colors.surface }]} />
          )}
          <View style={styles.imageOverlay} />
          <Text style={styles.artistName}>{event?.name}</Text>

          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Event info */}
        <View style={styles.infoSection}>
          {lineupArtists.length > 0 ? (
            <View style={styles.infoRow}>
              <Ionicons name="musical-notes-outline" size={18} color={Colors.primary} />
              <View style={styles.artistList}>
                {lineupArtists.map((artist, i) => (
                  <TouchableOpacity
                    key={artist.id}
                    onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id, name: artist.name, imageUrl: artist.image_url ?? '', genre: artist.genre ?? '' } })}
                  >
                    <Text style={styles.artistLink}>
                      {artist.name}{i < lineupArtists.length - 1 ? ', ' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              {event?.date
                ? new Date(event.date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'Datum onbekend'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>{event?.time || 'Tijd nog onbekend'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <TouchableOpacity
              onPress={() => event?.venueId ? router.push({ pathname: '/venue/[id]', params: { id: event.venueId, name: event.venue, city: event.city } }) : undefined}
              disabled={!event?.venueId}
            >
              <Text style={[styles.infoText, event?.venueId ? styles.linkText : undefined]}>{event?.venue}, {event?.city}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tickets button */}
        {event?.url ? (
          <TouchableOpacity
            style={styles.ticketButton}
            onPress={() => Linking.openURL(event.url!)}
          >
            <Text style={styles.ticketButtonText}>Tickets kopen</Text>
            <Ionicons name="open-outline" size={16} color={Colors.text} />
          </TouchableOpacity>
        ) : null}

        {/* Concert status buttons — logged-in only */}
        {user && (
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[styles.statusBtn, concertStatus === 'interested' && styles.statusBtnActive]}
            onPress={() => handleSetConcertStatus(concertStatus === 'interested' ? null : 'interested')}
          >
            <Ionicons
              name={concertStatus === 'interested' ? 'star' : 'star-outline'}
              size={16}
              color={concertStatus === 'interested' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.statusBtnText, concertStatus === 'interested' && styles.statusBtnTextActive]}>
              Geïnteresseerd
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusBtn, concertStatus === 'going' && styles.statusBtnActive]}
            onPress={() => handleSetConcertStatus(concertStatus === 'going' ? null : 'going')}
          >
            <Ionicons
              name={concertStatus === 'going' ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={16}
              color={concertStatus === 'going' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.statusBtnText, concertStatus === 'going' && styles.statusBtnTextActive]}>
              Ik ga
            </Text>
          </TouchableOpacity>
        </View>
        )}

        {/* Groups section */}
        <View style={styles.groupsSection}>
          <View style={styles.groupsHeader}>
            <Text style={styles.groupsTitle}>Groepen</Text>
            {user && (
            <TouchableOpacity style={styles.newGroupButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={18} color={Colors.text} />
              <Text style={styles.newGroupButtonText}>Nieuwe groep</Text>
            </TouchableOpacity>
            )}
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
                onPress={() => {
                  const pathname = (user && group.is_member) ? '/group/chat' : '/group/[id]';
                  router.push({
                    pathname,
                    params: {
                      id: group.id,
                      title: group.title,
                      description: group.description ?? '',
                      max_members: String(group.max_members),
                      created_by: group.created_by,
                      event_id: id,
                      event_name: event?.name ?? '',
                      event_image_url: event?.imageUrl ?? '',
                      event_date: event?.date ?? '',
                      event_location: event?.venue ? `${event.venue}, ${event.city}` : '',
                    },
                  });
                }}
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
                  {user && (group.is_member ? (
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
                  ))}
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
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={[styles.counterBtn, groupMaxMembers <= MIN_MEMBERS && styles.counterBtnDisabled]}
                onPress={() => setGroupMaxMembers((v) => Math.max(MIN_MEMBERS, v - 1))}
                disabled={groupMaxMembers <= MIN_MEMBERS}
              >
                <Ionicons name="remove" size={20} color={groupMaxMembers <= MIN_MEMBERS ? Colors.textMuted : Colors.text} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{groupMaxMembers}</Text>
              <TouchableOpacity
                style={[styles.counterBtn, groupMaxMembers >= MAX_MEMBERS && styles.counterBtnDisabled]}
                onPress={() => setGroupMaxMembers((v) => Math.min(MAX_MEMBERS, v + 1))}
                disabled={groupMaxMembers >= MAX_MEMBERS}
              >
                <Ionicons name="add" size={20} color={groupMaxMembers >= MAX_MEMBERS ? Colors.textMuted : Colors.text} />
              </TouchableOpacity>
            </View>
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
  artistList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  artistLink: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    textDecorationLine: 'underline',
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
  linkText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
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

  // Concert status buttons
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  statusBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  statusBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  statusBtnTextActive: {
    color: Colors.primary,
  },

  // Max members counter
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
  counterBtnDisabled: {
    opacity: 0.4,
  },
  counterValue: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    minWidth: 32,
    textAlign: 'center',
  },
});
