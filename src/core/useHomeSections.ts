import { useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import { dbRowToEvent, Event } from './types';

interface HomeSections {
  upcoming: Event[];
  buddies: Event[];
  buddyInterested: Event[];
  favouriteArtists: Event[];
  favouriteVenues: Event[];
  withGroups: Event[];
  nearby: Event[];
  groupCounts: Record<string, number>;
  loading: boolean;
}

const NEARBY_RADIUS_KM = 30;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetches all home page sections from Supabase:
 * 1. Binnenkort — upcoming concerts
 * 2. Je buddies gaan ook — events where buddies have groups
 * 3. Favoriete artiesten — events matching favourite artist names
 * 4. In de buurt — events near user's location
 */
export function useHomeSections() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<HomeSections>({
    upcoming: [],
    buddies: [],
    buddyInterested: [],
    favouriteArtists: [],
    favouriteVenues: [],
    withGroups: [],
    nearby: [],
    groupCounts: {},
    loading: true,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    const now = new Date().toISOString();

    // 1. Upcoming concerts
    const upcomingPromise = (async (): Promise<Event[]> => {
      const { data: rows } = await supabase
        .from('events')
        .select('*')
        .gte('date', now)
        .order('date', { ascending: true })
        .limit(20);
      return (rows ?? []).map(dbRowToEvent);
    })();

    // 2. Buddy events — concerts where buddies marked "going"
    const buddyPromise = (async (): Promise<Event[]> => {
      if (!user) return [];
      const { data: buddyRows } = await supabase
        .from('buddies')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      const buddyIds = (buddyRows ?? []).map((r: any) =>
        r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1
      );
      if (buddyIds.length === 0) return [];

      const { data: statusRows } = await supabase
        .from('concert_status')
        .select('event_id')
        .in('user_id', buddyIds)
        .eq('status', 'going');

      const eventIds = [...new Set((statusRows ?? []).map((r: any) => r.event_id))];
      if (eventIds.length === 0) return [];

      const { data: eventRows } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .gte('date', now)
        .order('date', { ascending: true });

      return (eventRows ?? []).map(dbRowToEvent);
    })();

    // 3. Buddy interested events
    const buddyInterestedPromise = (async (): Promise<Event[]> => {
      if (!user) return [];
      const { data: buddyRows } = await supabase
        .from('buddies')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      const buddyIds = (buddyRows ?? []).map((r: any) =>
        r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1
      );
      if (buddyIds.length === 0) return [];

      const { data: statusRows } = await supabase
        .from('concert_status')
        .select('event_id')
        .in('user_id', buddyIds)
        .eq('status', 'interested');

      const eventIds = [...new Set((statusRows ?? []).map((r: any) => r.event_id))];
      if (eventIds.length === 0) return [];

      const { data: eventRows } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .gte('date', now)
        .order('date', { ascending: true });

      return (eventRows ?? []).map(dbRowToEvent);
    })();

    // 4. Favourite artist events
    const favArtistPromise = (async (): Promise<Event[]> => {
      if (!user) return [];
      const { data: favRows } = await supabase
        .from('favourite_artists')
        .select('artists(name)')
        .eq('user_id', user.id)
        .limit(3);

      const artistNames = (favRows ?? [])
        .map((r: any) => r.artists?.name)
        .filter(Boolean) as string[];
      if (artistNames.length === 0) return [];

      // Search events whose name contains any of the artist names
      const filter = artistNames.map((n) => `name.ilike.%${n}%`).join(',');
      const { data: rows } = await supabase
        .from('events')
        .select('*')
        .or(filter)
        .gte('date', now)
        .order('date', { ascending: true })
        .limit(10);

      return (rows ?? []).map(dbRowToEvent);
    })();

    // 5. Favourite venue events
    const favVenuePromise = (async (): Promise<Event[]> => {
      if (!user) return [];
      const { data: favRows } = await supabase
        .from('favourite_venues')
        .select('venue_id')
        .eq('user_id', user.id);

      const venueIds = (favRows ?? []).map((r: any) => r.venue_id).filter(Boolean) as string[];
      if (venueIds.length === 0) return [];

      const { data: rows } = await supabase
        .from('events')
        .select('*')
        .in('venue_id', venueIds)
        .gte('date', now)
        .order('date', { ascending: true })
        .limit(20);

      return (rows ?? []).map(dbRowToEvent);
    })();

    // 6. Events with groups (no auth needed)
    const withGroupsPromise = (async (): Promise<Event[]> => {
      const { data: groupRows } = await supabase
        .from('groups')
        .select('event_id')
        .limit(100);

      const eventIds = [...new Set((groupRows ?? []).map((r: any) => r.event_id))];
      if (eventIds.length === 0) return [];

      const { data: eventRows } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .gte('date', now)
        .order('date', { ascending: true })
        .limit(20);

      return (eventRows ?? []).map(dbRowToEvent);
    })();

    // 7. Nearby events (show when user has coordinates, regardless of share_location)
    const nearbyPromise = (async (): Promise<Event[]> => {
      if (!profile?.latitude || !profile.longitude) return [];
      const latDelta = NEARBY_RADIUS_KM / 111;
      const lngDelta = NEARBY_RADIUS_KM / (111 * Math.cos((profile.latitude * Math.PI) / 180));

      const { data: rows } = await supabase
        .from('events')
        .select('*')
        .gte('date', now)
        .gte('latitude', profile.latitude - latDelta)
        .lte('latitude', profile.latitude + latDelta)
        .gte('longitude', profile.longitude - lngDelta)
        .lte('longitude', profile.longitude + lngDelta)
        .order('date', { ascending: true })
        .limit(20);

      // Fine-grained distance filter
      return (rows ?? [])
        .filter((e: any) =>
          e.latitude && e.longitude
            ? distanceKm(profile.latitude!, profile.longitude!, e.latitude, e.longitude) <= NEARBY_RADIUS_KM
            : false
        )
        .map(dbRowToEvent);
    })();

    const [upcoming, buddies, buddyInterested, favouriteArtists, favouriteVenues, withGroups, nearby] = await Promise.all([
      upcomingPromise,
      buddyPromise,
      buddyInterestedPromise,
      favArtistPromise,
      favVenuePromise,
      withGroupsPromise,
      nearbyPromise,
    ]);

    // Collect all event IDs to fetch group counts
    const allEventIds = new Set<string>();
    for (const list of [upcoming, buddies, buddyInterested, favouriteArtists, favouriteVenues, withGroups, nearby]) {
      for (const e of list) allEventIds.add(e.id);
    }

    let groupCounts: Record<string, number> = {};
    if (allEventIds.size > 0) {
      const { data: gcRows } = await supabase
        .from('groups')
        .select('event_id')
        .in('event_id', [...allEventIds]);

      if (gcRows) {
        for (const row of gcRows) {
          groupCounts[row.event_id] = (groupCounts[row.event_id] ?? 0) + 1;
        }
      }
    }

    const sortWithGroups = (events: Event[]) =>
      [...events].sort((a, b) => (groupCounts[b.id] ?? 0) - (groupCounts[a.id] ?? 0));

    setData({
      upcoming: sortWithGroups(upcoming),
      buddies: sortWithGroups(buddies),
      buddyInterested: sortWithGroups(buddyInterested),
      favouriteArtists: sortWithGroups(favouriteArtists),
      favouriteVenues: sortWithGroups(favouriteVenues),
      withGroups: sortWithGroups(withGroups),
      nearby: sortWithGroups(nearby),
      groupCounts,
      loading: false,
    });
  }, [user, profile]);

  return { ...data, load };
}
