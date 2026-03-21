import { useEffect, useState } from 'react';
import type { DbEvent } from './database.types';
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
        .select(filters?.groupsOnly ? '*, groups!inner(id, max_members)' : '*')
        .returns<DbEvent[]>();
      
      // Date filtering
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate.toISOString());
      } else {
        query = query.gte('date', new Date().toISOString());
      }

      if (filters?.endDate) {
        // Adjust end date to the end of the day
        const endDay = new Date(filters.endDate);
        endDay.setHours(23, 59, 59, 999);
        query = query.lte('date', endDay.toISOString());
      }

      query = query.order('date', { ascending: true });
      
      const hasActiveFilters = filters?.groupsOnly || filters?.startDate || filters?.endDate || keyword;
      if (hasActiveFilters) {
        query = query.limit(500); // Ruimere limiet bij gericht zoeken/filteren
      } else {
        query = query.limit(50); // Beperkte limiet op de standaard overzichtspagina
      }

      // Keyword search
      if (keyword) {
        query = query.or(
          `name.ilike.%${keyword}%,location_name.ilike.%${keyword}%,city.ilike.%${keyword}%`
        );
      }

      // Group size filtering Note: this must refer to the joined table 'groups'
      if (filters?.groupsOnly) {
        if (filters.minGroupSize) {
          query = query.gte('groups.max_members', parseInt(filters.minGroupSize, 10));
        }
        if (filters.maxGroupSize) {
          query = query.lte('groups.max_members', parseInt(filters.maxGroupSize, 10));
        }
      }

      const { data, error: err } = await query;
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
