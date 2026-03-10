import { ArtistChip, ArtistChipsGrid } from '@/components/design/ArtistChipsGrid';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { MetaItem } from '@/components/design/MetaItem';
import { SectionHeader } from '@/components/design/SectionHeader';
import { UserAvatar } from '@/components/design/UserAvatar';
import { VenueChip, VenueChipsGrid } from '@/components/design/VenueChipsGrid';
import { VibeTags } from '@/components/design/VibeTags';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { calculateAge } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile, signOut, user } = useAuth();
  const router = useRouter();
  const [buddyCount, setBuddyCount] = useState(0);
  const [favouriteArtists, setFavouriteArtists] = useState<ArtistChip[]>([]);
  const [favouriteVenues, setFavouriteVenues] = useState<VenueChip[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [buddyRes, favRes, venueRes] = await Promise.all([
      supabase.rpc('count_buddies', { user_id: user.id }),
      supabase
        .from('favourite_artists')
        .select('artist_id, artists(id, name, image_url, genre)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('favourite_venues')
        .select('venue_id, venues(id, name, city, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    setBuddyCount(buddyRes.data ?? 0);

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

    if (venueRes.data) {
      setFavouriteVenues(
        venueRes.data.map((row: any) => ({
          id: row.venues.id,
          name: row.venues.name,
          city: row.venues.city,
          image_url: row.venues.image_url,
        }))
      );
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (!profile) return <LoadingScreen />;

  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <UserAvatar uri={profile.avatar_url} initials={initials} size={120} />
        </View>

        {/* Name */}
        <Text style={styles.name}>{profile.first_name} {profile.last_name}</Text>

        {/* Meta row */}
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

        {/* Bio */}
        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Over mij</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

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
            <Text style={styles.emptyText}>Nog geen favoriete artiesten toegevoegd.</Text>
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
              onMorePress={() => router.push('/favourite-artists')}
            />
          )}
        </View>

        {/* Favoriete venues */}
        <View style={styles.section}>
          <SectionHeader icon="location" title="Favoriete venues" />
          {favouriteVenues.length === 0 ? (
            <Text style={styles.emptyText}>Nog geen favoriete venues toegevoegd.</Text>
          ) : (
            <VenueChipsGrid
              venues={favouriteVenues}
              maxVisible={5}
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

        {/* Profiel bewerken */}
        <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-profile')}>
          <Text style={styles.editButtonText}>Profiel bewerken</Text>
        </TouchableOpacity>

        {/* Uitloggen */}
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
