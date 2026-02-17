import { Event, TicketmasterEvent, TicketmasterResponse } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY;
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Convert a Ticketmaster event to our simpler Event format
function toEvent(tm: TicketmasterEvent): Event {
  const venue = tm._embedded?.venues?.[0];

  return {
    id: tm.id,
    name: tm.name,
    date: tm.dates.start.localDate ?? '',
    time: tm.dates.start.localTime ?? '',
    venue: venue?.name ?? 'Onbekend',
    city: venue?.city?.name ?? 'Onbekend',
    imageUrl: tm.images?.[0]?.url ?? '',
  };
}

// Only music events in Belgium
export async function searchEvents(keyword?: string): Promise<Event[]> {
  const params = new URLSearchParams({
    apikey: API_KEY ?? '',
    countryCode: 'BE',
    classificationName: 'music',
    size: '20',
    sort: 'date,asc',
  });

  if (keyword) {
    params.set('keyword', keyword);
  }

  const response = await fetch(`${BASE_URL}/events.json?${params}`);
  const data: TicketmasterResponse = await response.json();

  if (!data._embedded?.events) {
    return [];
  }

  return data._embedded.events.map(toEvent);
}
