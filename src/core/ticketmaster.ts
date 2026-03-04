import { Artist, Event, TicketmasterEvent, TicketmasterResponse } from './types';

const API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY;
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// ── Attractions (Artists) ──────────────────────────────

interface TicketmasterAttraction {
  id: string;
  name: string;
  images?: { url: string; width: number; height: number }[];
  classifications?: { genre?: { name: string }; segment?: { name: string } }[];
}

function toArtist(tm: TicketmasterAttraction): Artist {
  const genre =
    tm.classifications?.[0]?.genre?.name && tm.classifications[0].genre.name !== 'Undefined'
      ? tm.classifications[0].genre.name
      : tm.classifications?.[0]?.segment?.name ?? '';

  // Pick the widest image for best quality
  const bestImage = tm.images
    ?.slice()
    .sort((a, b) => b.width - a.width)[0];

  return {
    id: tm.id,
    name: tm.name,
    imageUrl: bestImage?.url ?? '',
    genre,
  };
}

export async function searchAttractions(keyword: string): Promise<Artist[]> {
  const params = new URLSearchParams({
    apikey: API_KEY ?? '',
    keyword,
    classificationName: 'music',
    size: '10',
    sort: 'relevance,desc',
  });

  const response = await fetch(`${BASE_URL}/attractions.json?${params}`);
  const data = await response.json();

  if (!data._embedded?.attractions) return [];
  return data._embedded.attractions.map(toArtist);
}

export async function getAttraction(id: string): Promise<Artist | null> {
  const params = new URLSearchParams({ apikey: API_KEY ?? '' });
  const response = await fetch(`${BASE_URL}/attractions/${id}.json?${params}`);
  if (!response.ok) return null;
  const data: TicketmasterAttraction = await response.json();
  return toArtist(data);
}

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
    url: tm.url,
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
