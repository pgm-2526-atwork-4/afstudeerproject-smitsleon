import { useAuth } from '@/core/context/AuthContext';
import { supabase } from '@/core/lib/supabase';
import { dbRowToEvent } from '@/core/lib/utils';
import { Event } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function VenueDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    city: string;
  }>();

  const [isFavourite, setIsFavourite] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [venueAddress, setVenueAddress] = useState('');
  const [venueImageUrl, setVenueImageUrl] = useState('');
  const [venueLatitude, setVenueLatitude] = useState<number | null>(null);
  const [venueLongitude, setVenueLongitude] = useState<number | null>(null);

  const checkFavourite = useCallback(async () => {
    if (!user || !params.id) return;
    const { data } = await supabase
      .from('favourite_venues')
      .select('venue_id')
      .eq('user_id', user.id)
      .eq('venue_id', params.id)
      .maybeSingle();
    setIsFavourite(!!data);
  }, [user, params.id]);

  const fetchVenueDetails = useCallback(async () => {
    if (!params.id) return;
    const { data: venue } = await supabase
      .from('venues')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();
    if (venue) {
      setVenueAddress(venue.address ?? '');
      setVenueImageUrl(venue.image_url ?? '');
      setVenueLatitude(venue.latitude);
      setVenueLongitude(venue.longitude);
    }
  }, [params.id]);

  const fetchUpcomingEvents = useCallback(async () => {
    if (!params.id) return;
    setLoadingEvents(true);
    try {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('venue_id', params.id)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(20);
      setUpcomingEvents((data ?? []).map(dbRowToEvent));
    } catch (e) {
      console.error('Error fetching venue events:', e);
    }
    setLoadingEvents(false);
  }, [params.id]);

  useEffect(() => {
    checkFavourite();
    fetchVenueDetails();
    fetchUpcomingEvents();
  }, [checkFavourite, fetchVenueDetails, fetchUpcomingEvents]);

  async function handleToggleFavourite() {
    if (!user || !params.id) return;
    setToggling(true);

    if (isFavourite) {
      await supabase
        .from('favourite_venues')
        .delete()
        .eq('user_id', user.id)
        .eq('venue_id', params.id);
      setIsFavourite(false);
    } else {
      await supabase.from('venues').upsert(
        {
          id: params.id,
          name: params.name,
          city: params.city || null,
          address: venueAddress || null,
          image_url: venueImageUrl || null,
          latitude: venueLatitude,
          longitude: venueLongitude,
        },
        { onConflict: 'id' }
      );
      await supabase.from('favourite_venues').insert({
        user_id: user.id,
        venue_id: params.id,
      });
      setIsFavourite(true);
    }
    setToggling(false);
  }

  function openInMaps() {
    if (venueLatitude && venueLongitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${venueLatitude},${venueLongitude}`;
      Linking.openURL(url);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header image */}
        <View style={styles.imageWrapper}>
          {venueImageUrl ? (
            <Image source={{ uri: venueImageUrl }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="location" size={64} color={Colors.textMuted} />
            </View>
          )}
          <View style={styles.imageOverlay} />
          <Text style={styles.venueName}>{params.name}</Text>

          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          {/* Favourite button */}
          {user && (
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
          )}
        </View>

        {/* Venue info */}
        <View style={styles.infoSection}>
          {params.city ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>{params.city}</Text>
            </View>
          ) : null}
          {venueAddress ? (
            <TouchableOpacity
              style={styles.infoRow}
              disabled={!venueLatitude || !venueLongitude}
              onPress={openInMaps}
            >
              <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
              <Text style={[styles.infoText, venueLatitude && venueLongitude ? styles.linkText : undefined]}>
                {venueAddress}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>


        {/* Upcoming events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Aankomende events</Text>

          {loadingEvents ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : upcomingEvents.length === 0 ? (
            <Text style={styles.emptyText}>
              Geen aankomende events gevonden voor deze venue.
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
                  {event.time ? (
                    <View style={styles.eventDetailRow}>
                      <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.eventDetailText}>{event.time}</Text>
                    </View>
                  ) : null}
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
  venueName: {
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
  infoSection: {
    padding: Spacing.lg,
    gap: Spacing.md,
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
