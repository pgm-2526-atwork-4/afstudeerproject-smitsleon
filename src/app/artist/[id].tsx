import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { searchEvents } from '@/core/ticketmaster';
import { Event } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ArtistProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    imageUrl: string;
    genre: string;
  }>();

  const [isFavourite, setIsFavourite] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Check if artist is already favourited
  const checkFavourite = useCallback(async () => {
    if (!user || !params.id) return;
    const { data } = await supabase
      .from('favourite_artists')
      .select('artist_id')
      .eq('user_id', user.id)
      .eq('artist_id', params.id)
      .maybeSingle();
    setIsFavourite(!!data);
  }, [user, params.id]);

  // Fetch upcoming events for this artist
  const fetchUpcomingEvents = useCallback(async () => {
    if (!params.name) return;
    setLoadingEvents(true);
    try {
      const events: Event[] = await searchEvents(params.name);
      setUpcomingEvents(events);
    } catch (e) {
      console.error('Error fetching artist events:', e);
    }
    setLoadingEvents(false);
  }, [params.name]);

  useEffect(() => {
    checkFavourite();
    fetchUpcomingEvents();
  }, [checkFavourite, fetchUpcomingEvents]);

  async function handleToggleFavourite() {
    if (!user || !params.id) return;
    setToggling(true);

    if (isFavourite) {
      // Remove from favourites
      await supabase
        .from('favourite_artists')
        .delete()
        .eq('user_id', user.id)
        .eq('artist_id', params.id);
      setIsFavourite(false);
    } else {
      // Upsert artist first (cache)
      await supabase.from('artists').upsert(
        {
          id: params.id,
          name: params.name,
          image_url: params.imageUrl || null,
          genre: params.genre || null,
        },
        { onConflict: 'id' }
      );
      // Add to favourites
      await supabase.from('favourite_artists').insert({
        user_id: user.id,
        artist_id: params.id,
      });
      setIsFavourite(true);
    }
    setToggling(false);
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

          {/* Favourite button */}
          <TouchableOpacity
            style={styles.favButton}
            onPress={handleToggleFavourite}
            disabled={toggling}
          >
            {toggling ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Ionicons
                name={isFavourite ? 'heart' : 'heart-outline'}
                size={28}
                color={isFavourite ? Colors.error : Colors.text}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Genre badge */}
        {params.genre ? (
          <View style={styles.genreRow}>
            <View style={styles.genreBadge}>
              <Ionicons name="musical-note" size={14} color={Colors.primary} />
              <Text style={styles.genreText}>{params.genre}</Text>
            </View>
          </View>
        ) : null}


        {/* Upcoming events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Aankomende events</Text>

          {loadingEvents ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : upcomingEvents.length === 0 ? (
            <Text style={styles.emptyText}>
              Geen aankomende events gevonden in België.
            </Text>
          ) : (
            upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({ pathname: '/concert/[id]', params: { id: event.id } })
                }
              >
                {event.imageUrl ? (
                  <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
                ) : null}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName} numberOfLines={2}>
                    {event.name}
                  </Text>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.eventDetailText}>{event.date}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.eventDetailText}>
                      {event.venue}, {event.city}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  artistName: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: 70,
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
  favButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  genreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  genreText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  eventsSection: {
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventImage: {
    width: 100,
    height: 100,
  },
  eventInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  eventName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eventDetailText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
});
