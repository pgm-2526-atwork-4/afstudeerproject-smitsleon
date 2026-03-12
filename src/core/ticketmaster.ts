import { Artist, Event, TicketmasterEvent, TicketmasterResponse, Venue } from './types';

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
  const rawTime = tm.dates.start.localTime ?? '';
  // Strip seconds: "20:00:00" → "20:00"
  const time = rawTime.length >= 5 ? rawTime.slice(0, 5) : rawTime;

  return {
    id: tm.id,
    name: tm.name,
    date: tm.dates.start.localDate ?? '',
    time,
    venue: venue?.name ?? 'Onbekend',
    venueId: venue?.id ?? '',
    city: venue?.city?.name ?? 'Onbekend',
    imageUrl: tm.images?.[0]?.url ?? '',
    url: tm.url,
  };
}

export async function getEvent(id: string): Promise<Event | null> {
  const params = new URLSearchParams({ apikey: API_KEY ?? '' });
  const response = await fetch(`${BASE_URL}/events/${encodeURIComponent(id)}.json?${params}`);
  if (!response.ok) return null;
  const data: TicketmasterEvent = await response.json();
  return toEvent(data);
}

// Only music events in Belgium
export async function searchEvents(keyword?: string, options?: { latlong?: string; radius?: number }): Promise<Event[]> {
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
  if (options?.latlong) {
    params.set('latlong', options.latlong);
    params.set('radius', String(options.radius ?? 50));
    params.set('unit', 'km');
  }

  const response = await fetch(`${BASE_URL}/events.json?${params}`);
  const data: TicketmasterResponse = await response.json();

  if (!data._embedded?.events) {
    return [];
  }

  return data._embedded.events.map(toEvent);
}

// ── Venues ─────────────────────────────────────────────

interface TicketmasterVenue {
  id: string;
  name: string;
  city?: { name: string };
  address?: { line1: string };
  location?: { longitude: string; latitude: string };
  images?: { url: string; width: number; height: number }[];
}

function toVenue(tm: TicketmasterVenue): Venue {
  const bestImage = tm.images
    ?.slice()
    .sort((a, b) => b.width - a.width)[0];

  return {
    id: tm.id,
    name: tm.name,
    city: tm.city?.name ?? '',
    address: tm.address?.line1 ?? '',
    imageUrl: bestImage?.url ?? '',
    latitude: tm.location?.latitude ? parseFloat(tm.location.latitude) : null,
    longitude: tm.location?.longitude ? parseFloat(tm.location.longitude) : null,
  };
}

export async function searchVenues(keyword: string): Promise<Venue[]> {
  const params = new URLSearchParams({
    apikey: API_KEY ?? '',
    keyword,
    countryCode: 'BE',
    size: '10',
    sort: 'relevance,desc',
  });

  const response = await fetch(`${BASE_URL}/venues.json?${params}`);
  const data = await response.json();

  if (!data._embedded?.venues) return [];
  return data._embedded.venues.map(toVenue);
}

export async function getVenue(id: string): Promise<Venue | null> {
  const params = new URLSearchParams({ apikey: API_KEY ?? '' });
  const response = await fetch(`${BASE_URL}/venues/${id}.json?${params}`);
  if (!response.ok) return null;
  const data: TicketmasterVenue = await response.json();
  return toVenue(data);
}

export async function getVenueEvents(venueId: string): Promise<Event[]> {
  const params = new URLSearchParams({
    apikey: API_KEY ?? '',
    venueId,
    classificationName: 'music',
    size: '20',
    sort: 'date,asc',
  });

  const response = await fetch(`${BASE_URL}/events.json?${params}`);
  const data: TicketmasterResponse = await response.json();

  if (!data._embedded?.events) return [];
  return data._embedded.events.map(toEvent);
}
