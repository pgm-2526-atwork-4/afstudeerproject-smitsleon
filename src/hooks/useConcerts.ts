import { useEffect, useState } from 'react';
import { searchEvents } from '../lib/ticketmaster';
import { Event } from '../types';

export function useConcerts() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load events (optionally with a search keyword)
  async function loadEvents(keyword?: string) {
    setLoading(true);
    setError(null);

    try {
      const results = await searchEvents(keyword);
      setEvents(results);
    } catch (err) {
      setError('Kon evenementen niet laden. Probeer het later opnieuw.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);

  return { events, loading, error, searchConcerts: loadEvents };
}
