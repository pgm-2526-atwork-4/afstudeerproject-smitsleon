import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { dbRowToEvent, Event, FilterState } from './types';

export function useConcerts() {
  const [events, setEvents] = useState<Event[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents(keyword?: string, filters?: FilterState) {
    setLoading(true);
    setError(null);

    try {
      // If groupsOnly is checked, we do an inner join on groups to only return events that have groups.
      let query = supabase
        .from('events')
        .select(filters?.groupsOnly ? '*, groups!inner(id, max_members)' : '*');

      let queryObj: any = query; // Bypass strict type inference for dynamic select and later access
      
      // Date filtering
      if (filters?.startDate) {
        queryObj = queryObj.gte('date', filters.startDate.toISOString());
      } else {
        queryObj = queryObj.gte('date', new Date().toISOString());
      }

      if (filters?.endDate) {
        // Adjust end date to the end of the day
        const endDay = new Date(filters.endDate);
        endDay.setHours(23, 59, 59, 999);
        queryObj = queryObj.lte('date', endDay.toISOString());
      }

      queryObj = queryObj.order('date', { ascending: true });
      
      const hasActiveFilters = filters?.groupsOnly || filters?.startDate || filters?.endDate || keyword;
      if (hasActiveFilters) {
        queryObj = queryObj.limit(500); // Ruimere limiet bij gericht zoeken/filteren
      } else {
        queryObj = queryObj.limit(50); // Beperkte limiet op de standaard overzichtspagina
      }

      // Keyword search
      if (keyword) {
        queryObj = queryObj.or(
          `name.ilike.%${keyword}%,location_name.ilike.%${keyword}%,city.ilike.%${keyword}%`
        );
      }

      // Group size filtering Note: this must refer to the joined table 'groups'
      if (filters?.groupsOnly) {
        if (filters.minGroupSize) {
          queryObj = queryObj.gte('groups.max_members', parseInt(filters.minGroupSize, 10));
        }
        if (filters.maxGroupSize) {
          queryObj = queryObj.lte('groups.max_members', parseInt(filters.maxGroupSize, 10));
        }
      }

      const { data, error: err } = await queryObj;
      if (err) throw err;

      // Ensure unique events since inner join with groups might return duplicates
      const uniqueEventsMap = new Map<string, Event>();
      for (const row of (data ?? [])) {
        if (!uniqueEventsMap.has(row.id)) {
          uniqueEventsMap.set(row.id, dbRowToEvent(row));
        }
      }

      const resultEvents = Array.from(uniqueEventsMap.values());

      let counts: Record<string, number> = {};
      if (resultEvents.length > 0) {
        const ids = resultEvents.map(e => e.id);
        const { data: gcRows } = await supabase.from('groups').select('event_id').in('event_id', ids);
        for (const row of gcRows ?? []) {
          counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
        }
        
        // Sort events with groups first, then chronologically
        resultEvents.sort((a, b) => {
          const countDiff = (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
          if (countDiff !== 0) return countDiff;
          return a.date.localeCompare(b.date);
        });
      }

      setGroupCounts(counts);
      setEvents(resultEvents);
    } catch (err) {
      setError('Kon evenementen niet laden. Probeer het later opnieuw.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Load initially without filters
  useEffect(() => {
    loadEvents();
  }, []);

  return { events, groupCounts, loading, error, searchConcerts: loadEvents };
}
