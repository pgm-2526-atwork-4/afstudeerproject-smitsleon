import { useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import { searchEvents } from './ticketmaster';
import { Event } from './types';

interface HomeSections {
  upcoming: Event[];
  buddies: Event[];
  favouriteArtists: Event[];
  nearby: Event[];
  groupCounts: Record<string, number>;
  loading: boolean;
}

/**
 * Fetches all home page sections in parallel:
 * 1. Binnenkort — upcoming concerts from Ticketmaster
 * 2. Je buddies gaan ook — events where buddies have or joined groups
 * 3. Favoriete artiesten — events by favourite artists
 * 4. In de buurt — events near user's location
 *
 * Also fetches group counts for all loaded events.
 */
export function useHomeSections() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<HomeSections>({
    upcoming: [],
    buddies: [],
    favouriteArtists: [],
    nearby: [],
    groupCounts: {},
    loading: true,
  });

  const load = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));

    // 1. Upcoming concerts (Ticketmaster)
    const upcomingPromise = searchEvents().catch(() => [] as Event[]);

    // 2. Buddy events (Supabase)
    const buddyPromise = (async (): Promise<Event[]> => {
      if (!user) return [];
      // Get buddy IDs
      const { data: buddyRows } = await supabase
        .from('buddies')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      const buddyIds = (buddyRows ?? []).map((r: any) =>
        r.user_id_1 === user.id ? r.user_id_2 : r.user_id_1
      );
      if (buddyIds.length === 0) return [];

      // Find groups where buddies are members
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id')
        .in('user_id', buddyIds);

      const groupIds = [...new Set((memberRows ?? []).map((r: any) => r.group_id))];
      if (groupIds.length === 0) return [];

      // Get event IDs from those groups
      const { data: groupRows } = await supabase
        .from('groups')
        .select('event_id')
        .in('id', groupIds);

      const eventIds = [...new Set((groupRows ?? []).map((r: any) => r.event_id))];
      if (eventIds.length === 0) return [];

      // Fetch events from Supabase events table
      const { data: eventRows } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true });

      return (eventRows ?? []).map((e: any) => ({
        id: e.id,
        name: e.name,
        date: e.date ?? '',
        time: '',
        venue: e.location_name ?? 'Onbekend',
        venueId: '',
        city: '',
        imageUrl: e.image_url ?? '',
      }));
    })();

    // 3. Favourite artist events (Ticketmaster)
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

      // Search events for each artist in parallel
      const results = await Promise.allSettled(
        artistNames.map((name) => searchEvents(name))
      );
      const allEvents: Event[] = [];
      const seen = new Set<string>();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const e of r.value) {
            if (!seen.has(e.id)) {
              seen.add(e.id);
              allEvents.push(e);
            }
          }
        }
      }
      return allEvents.slice(0, 10);
    })();

    // 4. Nearby events (Ticketmaster with latlong)
    const nearbyPromise = (async (): Promise<Event[]> => {
      if (!profile?.share_location || !profile.latitude || !profile.longitude) return [];
      return searchEvents(undefined, {
        latlong: `${profile.latitude},${profile.longitude}`,
        radius: 30,
      }).catch(() => [] as Event[]);
    })();

    const [upcoming, buddies, favouriteArtists, nearby] = await Promise.all([
      upcomingPromise,
      buddyPromise,
      favArtistPromise,
      nearbyPromise,
    ]);

    // Collect all event IDs to fetch group counts
    const allEventIds = new Set<string>();
    for (const list of [upcoming, buddies, favouriteArtists, nearby]) {
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

    // Sort concerts with groups first in each section
    const sortWithGroups = (events: Event[]) =>
      [...events].sort((a, b) => (groupCounts[b.id] ?? 0) - (groupCounts[a.id] ?? 0));

    setData({
      upcoming: sortWithGroups(upcoming),
      buddies: sortWithGroups(buddies),
      favouriteArtists: sortWithGroups(favouriteArtists),
      nearby: sortWithGroups(nearby),
      groupCounts,
      loading: false,
    });
  }, [user, profile]);

  return { ...data, load };
}
