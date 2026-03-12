import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { dbRowToEvent, Event } from './types';

export function useConcerts() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents(keyword?: string) {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(20);

      if (keyword) {
        query = query.or(
          `name.ilike.%${keyword}%,location_name.ilike.%${keyword}%,city.ilike.%${keyword}%`
        );
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setEvents((data ?? []).map(dbRowToEvent));
    } catch (err) {
      setError('Kon evenementen niet laden. Probeer het later opnieuw.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return { events, loading, error, searchConcerts: loadEvents };
}
