import { ArtistChip, ArtistChipsGrid } from '@/components/design/ArtistChipsGrid';
import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { MetaItem } from '@/components/design/MetaItem';
import { SectionHeader } from '@/components/design/SectionHeader';
import { UserAvatar } from '@/components/design/UserAvatar';
import { VibeTags } from '@/components/design/VibeTags';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { UserProfile, calculateAge } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type BuddyStatus = 'none' | 'pending_incoming' | 'pending_outgoing' | 'buddies';

export default function UserProfileScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buddyCount, setBuddyCount] = useState(0);
  const [buddyStatus, setBuddyStatus] = useState<BuddyStatus>('none');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [favouriteArtists, setFavouriteArtists] = useState<ArtistChip[]>([]);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [profileRes, buddyCountRes, favRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', id).single(),
      supabase.rpc('count_buddies', { user_id: id }),
      supabase
        .from('favourite_artists')
        .select('artist_id, artists(id, name, image_url, genre)')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (!profileRes.error) setProfile(profileRes.data as UserProfile);
    setBuddyCount(buddyCountRes.data ?? 0);

    if (favRes.data) {
      setFavouriteArtists(
        favRes.data.map((row: any) => ({
          id: row.artists.id,
          name: row.artists.name,
          image_url: row.artists.image_url,
          genre: row.artists.genre,
        }))
      );
    }

    // Check buddy relationship
    if (currentUser && currentUser.id !== id) {
      const { data: areBuddies } = await supabase.rpc('are_buddies', {
        user_a: currentUser.id,
        user_b: id,
      });
      if (areBuddies) {
        setBuddyStatus('buddies');
      } else {
        const { data: incoming } = await supabase
          .from('buddy_requests')
          .select('id')
          .eq('from_user_id', id)
          .eq('to_user_id', currentUser.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (incoming) {
          setBuddyStatus('pending_incoming');
          setPendingRequestId(incoming.id);
        } else {
          const { data: outgoing } = await supabase
            .from('buddy_requests')
            .select('id')
            .eq('from_user_id', currentUser.id)
            .eq('to_user_id', id)
            .eq('status', 'pending')
            .maybeSingle();

          if (outgoing) {
            setBuddyStatus('pending_outgoing');
            setPendingRequestId(outgoing.id);
          }
        }
      }
    }

    setLoading(false);
  }, [id, currentUser]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // --- Actions ---
  async function handleSendRequest() {
    if (!currentUser || !id) return;
    setSending(true);
    const { error } = await supabase
      .from('buddy_requests')
      .insert({ from_user_id: currentUser.id, to_user_id: id });
    if (error) Alert.alert('Fout', 'Kon buddy verzoek niet versturen.');
    else { setBuddyStatus('pending_outgoing'); Alert.alert('Verstuurd', 'Buddy verzoek is verstuurd!'); }
    setSending(false);
  }

  async function handleAcceptRequest() {
    if (!pendingRequestId) return;
    setSending(true);
    const { error } = await supabase.rpc('accept_buddy_request', { request_id: pendingRequestId });
    if (error) Alert.alert('Fout', 'Kon verzoek niet accepteren.');
    else { setBuddyStatus('buddies'); setBuddyCount((c) => c + 1); }
    setSending(false);
  }

  async function handleDeclineRequest() {
    if (!pendingRequestId) return;
    setSending(true);
    const { error } = await supabase.rpc('decline_buddy_request', { request_id: pendingRequestId });
    if (error) Alert.alert('Fout', 'Kon verzoek niet weigeren.');
    else { setBuddyStatus('none'); setPendingRequestId(null); }
    setSending(false);
  }

  async function handleWithdrawRequest() {
    if (!pendingRequestId) return;
    setSending(true);
    const { error } = await supabase.from('buddy_requests').delete().eq('id', pendingRequestId);
    if (error) Alert.alert('Fout', 'Kon verzoek niet intrekken.');
    else { setBuddyStatus('none'); setPendingRequestId(null); }
    setSending(false);
  }

  // --- Loading / Error states ---
  if (loading) return <LoadingScreen />;
  if (!profile) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <EmptyState icon="person-outline" title="Gebruiker niet gevonden" />
      </View>
    );
  }

  const isOwnProfile = currentUser?.id === id;
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <UserAvatar uri={profile.avatar_url} initials={initials} size={120} />
        </View>

        {/* Name */}
        <Text style={styles.name}>
          {profile.first_name} {profile.last_name}{isOwnProfile ? ' (jij)' : ''}
        </Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          {profile.birth_date ? (
            <MetaItem icon="calendar-outline" label={`${calculateAge(profile.birth_date)} jaar`} />
          ) : null}
          {profile.city && profile.share_location !== false ? (
            <MetaItem icon="location-outline" label={profile.city} />
          ) : null}
          <MetaItem
            icon="people-outline"
            label={`${buddyCount} ${buddyCount === 1 ? 'buddy' : 'buddies'}`}
            onPress={() => router.push({ pathname: '/buddies', params: { userId: id } })}
          />
        </View>

        {/* Bio */}
        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Over {profile.first_name}</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* Buddy actions — after bio */}
        {!isOwnProfile && (
          <View style={styles.buddyActions}>
            {buddyStatus === 'none' && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSendRequest} disabled={sending}>
                {sending ? <ActivityIndicator size="small" color={Colors.text} /> : (
                  <>
                    <Ionicons name="person-add-outline" size={20} color={Colors.text} />
                    <Text style={styles.primaryBtnText}>Buddy verzoek sturen</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {buddyStatus === 'pending_incoming' && (
              <View style={styles.actionGroup}>
                <Text style={styles.pendingLabel}>{profile.first_name} wil jouw buddy worden</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAcceptRequest} disabled={sending}>
                    {sending ? <ActivityIndicator size="small" color={Colors.text} /> : <Text style={styles.actionBtnText}>Accepteren</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={handleDeclineRequest} disabled={sending}>
                    {sending ? <ActivityIndicator size="small" color={Colors.text} /> : <Text style={styles.actionBtnText}>Afwijzen</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {buddyStatus === 'pending_outgoing' && (
              <TouchableOpacity style={[styles.primaryBtn, styles.disabledBtn]} onPress={handleWithdrawRequest} disabled={sending}>
                {sending ? <ActivityIndicator size="small" color={Colors.textMuted} /> : (
                  <>
                    <Ionicons name="close-circle-outline" size={20} color={Colors.textMuted} />
                    <Text style={styles.disabledBtnText}>Verzoek intrekken</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {buddyStatus === 'buddies' && (
              <View style={styles.actionGroup}>
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  <Text style={styles.successBadgeText}>Buddies</Text>
                </View>
                <View style={styles.messageRow}>
                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => router.push({ pathname: '/private-chat', params: { userId: id, firstName: profile.first_name, lastName: profile.last_name, avatarUrl: profile.avatar_url ?? '' } })}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={Colors.text} />
                    <Text style={styles.messageBtnText}>Bericht sturen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => router.push({ pathname: '/buddies', params: { userId: id } })}
                  >
                    <Ionicons name="people-outline" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Vibes */}
        {profile.vibe_tags && profile.vibe_tags.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vibes</Text>
            <VibeTags tags={profile.vibe_tags} />
          </View>
        ) : null}

        {/* Favoriete artiesten */}
        <View style={styles.section}>
          <SectionHeader icon="musical-notes" title="Favoriete artiesten" />
          {favouriteArtists.length === 0 ? (
            <Text style={styles.emptyText}>Nog geen favoriete artiesten.</Text>
          ) : (
            <ArtistChipsGrid
              artists={favouriteArtists}
              maxVisible={5}
              onArtistPress={(artist) =>
                router.push({
                  pathname: '/artist/[id]',
                  params: { id: artist.id, name: artist.name, imageUrl: artist.image_url ?? '', genre: artist.genre ?? '' },
                })
              }
              onMorePress={() => router.push({ pathname: '/favourite-artists', params: { userId: id } })}
            />
          )}
        </View>

        {/* Member since */}
        <View style={styles.section}>
          <Text style={styles.joinedText}>
            Lid sinds {new Date(profile.created_at).toLocaleDateString('nl-BE', { year: 'numeric', month: 'long' })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  backBtn: {
    marginTop: 50,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
    padding: Spacing.xs,
  },
  avatarWrapper: { alignItems: 'center', marginBottom: Spacing.md },
  name: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing.xs },
  metaRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.sm },
  bioText: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 22 },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  joinedText: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center' },

  // Buddy actions
  buddyActions: { marginBottom: Spacing.xl, gap: Spacing.md },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
  },
  primaryBtnText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  disabledBtn: { backgroundColor: Colors.surface },
  disabledBtnText: { color: Colors.textMuted, fontSize: FontSizes.md, fontWeight: 'bold' },
  actionGroup: { gap: Spacing.md },
  pendingLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: Colors.primary },
  declineBtn: { backgroundColor: Colors.error },
  actionBtnText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
  },
  successBadgeText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  messageRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
  },
  messageBtnText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
