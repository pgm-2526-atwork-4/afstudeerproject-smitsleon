import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { calculateAge } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FavArtist {
  id: string;
  name: string;
  image_url: string | null;
  genre: string | null;
}

export default function ProfileScreen() {
  const { profile, signOut, user } = useAuth();
  const router = useRouter();
  const [buddyCount, setBuddyCount] = useState(0);
  const [favouriteArtists, setFavouriteArtists] = useState<FavArtist[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Buddy count
    const { data: buddyData } = await supabase.rpc('count_buddies', { user_id: user.id });
    setBuddyCount(buddyData ?? 0);

    // Favourite artists
    const { data: favData } = await supabase
      .from('favourite_artists')
      .select('artist_id, artists(id, name, image_url, genre)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (favData) {
      const parsed: FavArtist[] = favData.map((row: any) => ({
        id: row.artists.id,
        name: row.artists.name,
        image_url: row.artists.image_url,
        genre: row.artists.genre,
      }));
      setFavouriteArtists(parsed);
    }

  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Profiel laden...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
        </Text>

        {/* Age, City, Buddies, Favourite Artists */}
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
          <TouchableOpacity 
            style={styles.metaItem}
            onPress={() => router.push('/buddies')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{buddyCount} {buddyCount === 1 ? 'buddy' : 'buddies'}</Text>
          </TouchableOpacity>
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
            <View style={styles.tagsRow}>
              {profile.vibe_tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Favoriete artiesten */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="musical-notes" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Favoriete artiesten</Text>
          </View>
          {favouriteArtists.length === 0 ? (
            <Text style={styles.emptyText}>Nog geen favoriete artiesten toegevoegd.</Text>
          ) : (
            <View style={styles.artistsGrid}>
              {favouriteArtists.slice(0, 5).map((artist) => (
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
              {favouriteArtists.length > 5 && (
                <TouchableOpacity
                  style={styles.artistChip}
                  activeOpacity={0.7}
                  onPress={() => router.push('/favourite-artists')}
                >
                  <View style={[styles.artistAvatar, styles.overflowChip]}>
                    <Text style={styles.overflowChipText}>+{favouriteArtists.length - 5}</Text>
                  </View>
                  <Text style={styles.artistChipName} numberOfLines={1}>Meer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Profiel bewerken button */}
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
  },
  avatarWrapper: {
    alignItems: 'center',
    marginTop: Spacing.xl,
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
    flexWrap: 'wrap',
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
    fontSize: FontSizes.sm,
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
  overflowChip: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overflowChipText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  artistChipName: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
  },
});
