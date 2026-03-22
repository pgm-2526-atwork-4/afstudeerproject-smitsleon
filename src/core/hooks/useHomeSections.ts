import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { dbRowToEvent, distanceKm, getBuddyIds } from '../lib/utils';
import { Event } from '../types';
import { ConcertStatusEventId, DbEvent, FavArtistWithName, FavVenueId, GroupEventId } from '../types/database.types';

interface HomeSections {
  upcoming: Event[];
  buddies: Event[];
  buddyInterested: Event[];
  favouriteArtists: Event[];
  favouriteVenues: Event[];
  withGroups: Event[];
  nearby: Event[];
  allConcerts: Event[];
  groupCounts: Record<string, number>;
  loading: boolean;
}

const NEARBY_RADIUS_KM = 30;

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
    allConcerts: [],
    groupCounts: {},
    loading: true,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    const now = new Date().toISOString();

    const buddyIds = user ? await getBuddyIds(user.id) : [];

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
      if (!user || buddyIds.length === 0) return [];

      const { data: statusRows } = await supabase
        .from('concert_status')
        .select('event_id')
        .in('user_id', buddyIds)
        .eq('status', 'going');

      const eventIds = [...new Set((statusRows ?? []).map((r: ConcertStatusEventId) => r.event_id))];
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
      if (!user || buddyIds.length === 0) return [];

      const { data: statusRows } = await supabase
        .from('concert_status')
        .select('event_id')
        .in('user_id', buddyIds)
        .eq('status', 'interested');

      const eventIds = [...new Set((statusRows ?? []).map((r: ConcertStatusEventId) => r.event_id))];
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

      const artistNames = ((favRows ?? []) as unknown as FavArtistWithName[])
        .map((r) => r.artists?.name)
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

      const venueIds = (favRows ?? []).map((r: FavVenueId) => r.venue_id).filter(Boolean) as string[];
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

    // 6. Events with groups
    const withGroupsPromise = (async (): Promise<Event[]> => {
      const { data: groupRows } = await supabase
        .from('groups')
        .select('event_id')
        .limit(100);

      const eventIds = [...new Set((groupRows ?? []).map((r: GroupEventId) => r.event_id))];
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

    // 7. Nearby events
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

      // distance filter
      return (rows ?? [])
        .filter((e: DbEvent) =>
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

    const withGroupIds = new Set(withGroups.map((e) => e.id));
    const remainingUpcoming = upcoming.filter((e) => !withGroupIds.has(e.id));
    const allConcerts = [
      ...sortWithGroups(withGroups),
      ...remainingUpcoming,
    ];

    setData({
      upcoming: sortWithGroups(upcoming),
      buddies: sortWithGroups(buddies),
      buddyInterested: sortWithGroups(buddyInterested),
      favouriteArtists: sortWithGroups(favouriteArtists),
      favouriteVenues: sortWithGroups(favouriteVenues),
      withGroups: sortWithGroups(withGroups),
      nearby: sortWithGroups(nearby),
      allConcerts,
      groupCounts,
      loading: false,
    });
  }, [user, profile]);

  return { ...data, load };
}
