import { ArtistChip, ArtistChipsGrid } from '@/components/design/ArtistChipsGrid';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { MetaItem } from '@/components/design/MetaItem';
import { SectionHeader } from '@/components/design/SectionHeader';
import { UserAvatar } from '@/components/design/UserAvatar';
import { VenueChip, VenueChipsGrid } from '@/components/design/VenueChipsGrid';
import { VibeTags } from '@/components/design/VibeTags';
import { LoginForm } from '@/components/functional/LoginForm';
import { useAuth } from '@/core/context/AuthContext';
import { supabase } from '@/core/lib/supabase';
import { calculateAge } from '@/core/lib/utils';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile, signOut, user } = useAuth();
  const router = useRouter();
  const [buddyCount, setBuddyCount] = useState(0);
  const [interestedCount, setInterestedCount] = useState(0);
  const [goingCount, setGoingCount] = useState(0);
  const [favouriteArtists, setFavouriteArtists] = useState<ArtistChip[]>([]);
  const [favouriteVenues, setFavouriteVenues] = useState<VenueChip[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [buddyRes, favRes, venueRes, interestedRes, goingRes] = await Promise.all([
      supabase.rpc('count_buddies', { user_id: user.id }),
      supabase
        .from('favourite_artists')
        .select('artist_id, artists(id, name, image_url, genre)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .returns<{ artist_id: string; artists: { id: string; name: string; image_url: string | null; genre: string | null } | null }[]>(),
      supabase
        .from('favourite_venues')
        .select('venue_id, venues(id, name, city, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .returns<{ venue_id: string; venues: { id: string; name: string; city: string | null; image_url: string | null } | null }[]>(),
      supabase
        .from('concert_status')
        .select('event_id, events!inner(date)', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'interested')
        .gte('events.date', new Date().toISOString()),
      supabase
        .from('concert_status')
        .select('event_id, events!inner(date)', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'going')
        .gte('events.date', new Date().toISOString()),
    ]);

    setBuddyCount(buddyRes.data ?? 0);
    setInterestedCount(interestedRes.count ?? 0);
    setGoingCount(goingRes.count ?? 0);

    if (favRes.data) {
      setFavouriteArtists(
        favRes.data.map((row) => ({
          id: row.artists?.id ?? '',
          name: row.artists?.name ?? '',
          image_url: row.artists?.image_url ?? null,
          genre: row.artists?.genre ?? null,
        }))
      );
    }

    if (venueRes.data) {
      setFavouriteVenues(
        venueRes.data.map((row) => ({
          id: row.venues?.id ?? '',
          name: row.venues?.name ?? '',
          city: row.venues?.city ?? null,
          image_url: row.venues?.image_url ?? null,
        }))
      );
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoginForm onRegisterPress={() => router.push('/(tabs)/register')} />
      </SafeAreaView>
    );
  }

  if (!profile) return <LoadingScreen />;

  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarWrapper}>
          <UserAvatar uri={profile.avatar_url} initials={initials} size={120} />
        </View>

        <Text style={styles.name}>{profile.first_name} {profile.last_name}</Text>

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
            onPress={() => router.push('/buddies')}
          />
        </View>

        <View style={styles.metaRow}>
          <MetaItem
            icon="star-outline"
            iconColor={Colors.primary}
            label={`${interestedCount} geïnteresseerd`}
            labelColor={Colors.primary}
            onPress={() => router.push({ pathname: '/my-concerts', params: { status: 'interested' } })}
          />
          <MetaItem
            icon="checkmark-circle-outline"
            iconColor={Colors.primary}
            label={`${goingCount} ${goingCount === 1 ? 'concert' : 'concerten'}`}
            labelColor={Colors.primary}
            onPress={() => router.push({ pathname: '/my-concerts', params: { status: 'going' } })}
          />
        </View>

        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Over mij</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {profile.vibe_tags && profile.vibe_tags.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vibes</Text>
            <VibeTags tags={profile.vibe_tags} />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader icon="musical-notes" title="Favoriete artiesten" />
          {favouriteArtists.length === 0 ? (
            <Text style={styles.emptyText}>Nog geen favoriete artiesten toegevoegd.</Text>
          ) : (
            <ArtistChipsGrid
              artists={favouriteArtists}
              maxVisible={3}
              onArtistPress={(artist) =>
                router.push({
                  pathname: '/artist/[id]',
                  params: { id: artist.id, name: artist.name, imageUrl: artist.image_url ?? '', genre: artist.genre ?? '' },
                })
              }
              onMorePress={() => router.push('/favourite-artists')}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader icon="location" title="Favoriete venues" />
          {favouriteVenues.length === 0 ? (
            <Text style={styles.emptyText}>Nog geen favoriete venues toegevoegd.</Text>
          ) : (
            <VenueChipsGrid
              venues={favouriteVenues}
              maxVisible={3}
              onVenuePress={(venue) =>
                router.push({
                  pathname: '/venue/[id]',
                  params: { id: venue.id, name: venue.name },
                })
              }
              onMorePress={() => router.push('/favourite-venues')}
            />
          )}
        </View>

        <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-profile')}>
          <Text style={styles.editButtonText}>Profiel bewerken</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Uitloggen</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  avatarWrapper: { alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.md },
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
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  bioText: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 22 },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  editButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editButtonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  logoutButton: { paddingVertical: Spacing.md, alignItems: 'center' },
  logoutText: { color: Colors.error, fontSize: FontSizes.sm },
});
