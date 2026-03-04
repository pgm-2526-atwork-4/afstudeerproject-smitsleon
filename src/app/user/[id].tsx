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
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface FavArtist {
  id: string;
  name: string;
  image_url: string | null;
  genre: string | null;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buddyCount, setBuddyCount] = useState(0);
  const [buddyStatus, setBuddyStatus] = useState<'none' | 'pending_incoming' | 'pending_outgoing' | 'buddies'>('none');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [favouriteArtists, setFavouriteArtists] = useState<FavArtist[]>([]);
  const [favCount, setFavCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
    } else {
      setProfile(data as UserProfile);
    }

    // Fetch buddy count
    const { data: countData } = await supabase.rpc('count_buddies', { user_id: id });
    setBuddyCount(countData ?? 0);

    // Check buddy status with current user
    if (currentUser && currentUser.id !== id) {
      // Check if already buddies
      const { data: areBuddiesData } = await supabase.rpc('are_buddies', {
        user_a: currentUser.id,
        user_b: id,
      });
      if (areBuddiesData) {
        setBuddyStatus('buddies');
      } else {
        // Check if there's an incoming request (they sent to me)
        const { data: incomingRequest } = await supabase
          .from('buddy_requests')
          .select('id')
          .eq('from_user_id', id)
          .eq('to_user_id', currentUser.id)
          .eq('status', 'pending')
          .maybeSingle();
        
        if (incomingRequest) {
          setBuddyStatus('pending_incoming');
          setPendingRequestId(incomingRequest.id);
        } else {
          // Check if there's an outgoing request (I sent to them)
          const { data: outgoingRequest } = await supabase
            .from('buddy_requests')
            .select('id')
            .eq('from_user_id', currentUser.id)
            .eq('to_user_id', id)
            .eq('status', 'pending')
            .maybeSingle();
          
          if (outgoingRequest) {
            setBuddyStatus('pending_outgoing');
            setPendingRequestId(outgoingRequest.id);
          }
        }
      }
    }

    // Fetch favourite artists
    const { data: favData } = await supabase
      .from('favourite_artists')
      .select('artist_id, artists(id, name, image_url, genre)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (favData) {
      setFavouriteArtists(
        favData.map((row: any) => ({
          id: row.artists.id,
          name: row.artists.name,
          image_url: row.artists.image_url,
          genre: row.artists.genre,
        }))
      );
    }

    const { count: fc } = await supabase
      .from('favourite_artists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);
    setFavCount(fc ?? 0);

    setLoading(false);
  }, [id, currentUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Gebruiker niet gevonden</Text>
        </View>
      </View>
    );
  }

  const isOwnProfile = currentUser?.id === id;

  async function handleSendBuddyRequest() {
    if (!currentUser || !id) return;
    setSending(true);
    const { error } = await supabase
      .from('buddy_requests')
      .insert({ from_user_id: currentUser.id, to_user_id: id });
    if (error) {
      console.error('Error sending buddy request:', error);
      Alert.alert('Fout', 'Kon buddy verzoek niet versturen. Probeer opnieuw.');
    } else {
      setBuddyStatus('pending_outgoing');
      Alert.alert('Verstuurd', 'Buddy verzoek is verstuurd!');
    }
    setSending(false);
  }

  async function handleAcceptRequest() {
    if (!pendingRequestId) return;
    setSending(true);
    const { error } = await supabase.rpc('accept_buddy_request', { request_id: pendingRequestId });
    if (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Fout', 'Kon verzoek niet accepteren. Probeer opnieuw.');
    } else {
      setBuddyStatus('buddies');
      setBuddyCount(prev => prev + 1);
    }
    setSending(false);
  }

  async function handleDeclineRequest() {
    if (!pendingRequestId) return;
    setSending(true);
    const { error } = await supabase.rpc('decline_buddy_request', { request_id: pendingRequestId });
    if (error) {
      console.error('Error declining request:', error);
      Alert.alert('Fout', 'Kon verzoek niet weigeren. Probeer opnieuw.');
    } else {
      setBuddyStatus('none');
      setPendingRequestId(null);
    }
    setSending(false);
  }

  async function handleWithdrawRequest() {
    if (!pendingRequestId) return;
    setSending(true);
    const { error } = await supabase
      .from('buddy_requests')
      .delete()
      .eq('id', pendingRequestId);
    if (error) {
      console.error('Error withdrawing request:', error);
      Alert.alert('Fout', 'Kon verzoek niet intrekken. Probeer opnieuw.');
    } else {
      setBuddyStatus('none');
      setPendingRequestId(null);
    }
    setSending(false);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={48} color={Colors.textMuted} />
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.name}>
          {profile.first_name} {profile.last_name}
          {isOwnProfile ? ' (jij)' : ''}
        </Text>

        {/* Age & City */}
        <View style={styles.metaRow}>
          {profile.birth_date ? (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{calculateAge(profile.birth_date)} jaar</Text>
            </View>
          ) : null}
          {profile.city && profile.share_location !== false ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{profile.city}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{buddyCount} {buddyCount === 1 ? 'buddy' : 'buddies'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="heart" size={14} color={Colors.error} />
            <Text style={styles.metaText}>{favCount} {favCount === 1 ? 'artiest' : 'artiesten'}</Text>
          </View>
        </View>

        {/* Bio */}
        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Over {profile.first_name}</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* Vibes */}
        {profile.vibe_tags && profile.vibe_tags.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vibes</Text>
            <View style={styles.tagsRow}>
              {profile.vibe_tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Top 5 artiesten */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="musical-notes" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Top 5 artiesten</Text>
          </View>
          {favouriteArtists.length === 0 ? (
            <Text style={styles.emptyText}>Nog geen favoriete artiesten.</Text>
          ) : (
            <View style={styles.artistsGrid}>
              {favouriteArtists.map((artist) => (
                <TouchableOpacity
                  key={artist.id}
                  style={styles.artistChip}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/artist/[id]',
                      params: {
                        id: artist.id,
                        name: artist.name,
                        imageUrl: artist.image_url ?? '',
                        genre: artist.genre ?? '',
                      },
                    })
                  }
                >
                  {artist.image_url ? (
                    <Image source={{ uri: artist.image_url }} style={styles.artistAvatar} />
                  ) : (
                    <View style={[styles.artistAvatar, styles.artistAvatarPlaceholder]}>
                      <Ionicons name="musical-note" size={16} color={Colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.artistChipName} numberOfLines={1}>
                    {artist.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Member since */}
        <View style={styles.section}>
          <Text style={styles.joinedText}>
            Lid sinds {new Date(profile.created_at).toLocaleDateString('nl-BE', { year: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Buddy request button */}
        {!isOwnProfile && buddyStatus === 'none' && (
          <TouchableOpacity
            style={styles.buddyButton}
            onPress={handleSendBuddyRequest}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color={Colors.text} />
                <Text style={styles.buddyButtonText}>Buddy verzoek sturen</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {!isOwnProfile && buddyStatus === 'pending_incoming' && (
          <View style={styles.buddyActionsGroup}>
            <Text style={styles.pendingLabel}>{profile.first_name} wil jouw buddy worden</Text>
            <View style={styles.buddyActionsRow}>
              <TouchableOpacity
                style={[styles.buddyActionButton, styles.acceptActionButton]}
                onPress={handleAcceptRequest}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Text style={styles.buddyActionText}>Accepteren</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buddyActionButton, styles.declineActionButton]}
                onPress={handleDeclineRequest}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Text style={styles.buddyActionText}>Afwijzen</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        {!isOwnProfile && buddyStatus === 'pending_outgoing' && (
          <TouchableOpacity
            style={[styles.buddyButton, styles.buddyButtonDisabled]}
            onPress={handleWithdrawRequest}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.textMuted} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.buddyButtonTextDisabled}>Verzoek intrekken</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {!isOwnProfile && buddyStatus === 'buddies' && (
          <View style={[styles.buddyButton, styles.buddyButtonSuccess]}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.buddyButtonTextSuccess}>Jullie zijn buddies</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    marginTop: 50,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
    alignSelf: 'flex-start',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  artistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  artistChip: {
    alignItems: 'center',
    width: 80,
    gap: Spacing.xs,
  },
  artistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceLight,
  },
  artistAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistChipName: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  bioText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tagText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  joinedText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  buddyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  buddyButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  buddyButtonDisabled: {
    backgroundColor: Colors.surface,
  },
  buddyButtonTextDisabled: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  buddyButtonSuccess: {
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buddyButtonTextSuccess: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  buddyActionsGroup: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  pendingLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  buddyActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  buddyActionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptActionButton: {
    backgroundColor: Colors.primary,
  },
  declineActionButton: {
    backgroundColor: Colors.error,
  },
  buddyActionText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
