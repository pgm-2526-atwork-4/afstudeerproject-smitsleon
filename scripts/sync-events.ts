/**
 * sync-events.ts
 *
 * Standalone script dat alle muziekevents in België ophaalt van de
 * Ticketmaster Discovery API en ze upsert in Supabase:
 *   - events tabel  (alle concerten)
 *   - venues tabel  (alle venues uit de events)
 *   - artists tabel (alle artiesten / attractions uit de events)
 *
 * Gebruik:
 *   npm run sync-events
 *
 * Vereiste env-variabelen:
 *   EXPO_PUBLIC_TICKETMASTER_API_KEY
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY        (niet de anon key — we bypassen RLS)
 */

import { createClient } from '@supabase/supabase-js';

// ── Env ────────────────────────────────────────────────

const TM_API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TM_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Ontbrekende env-variabelen. Zorg dat EXPO_PUBLIC_TICKETMASTER_API_KEY, EXPO_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY gezet zijn.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Ticketmaster types ─────────────────────────────────

interface TmVenue {
  id: string;
  name: string;
  city?: { name: string };
  address?: { line1: string };
  location?: { latitude: string; longitude: string };
  images?: { url: string; width: number; height: number }[];
}

interface TmAttraction {
  id: string;
  name: string;
  images?: { url: string; width: number; height: number }[];
  classifications?: { genre?: { name: string }; segment?: { name: string } }[];
}

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  dates: { start: { localDate?: string; localTime?: string } };
  images?: { url: string; width: number; height: number }[];
  _embedded?: {
    venues?: TmVenue[];
    attractions?: TmAttraction[];
  };
}

interface TmPage {
  _embedded?: { events: TmEvent[] };
  page: { size: number; totalElements: number; totalPages: number; number: number };
}

// ── Fetch alle events van Ticketmaster (gepagineerd) ───

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

async function fetchAllEvents(): Promise<TmEvent[]> {
  const allEvents: TmEvent[] = [];
  let page = 0;
  const pageSize = 200;
  const maxPages = 5; // TM max = 1000 resultaten

  while (page < maxPages) {
    const params = new URLSearchParams({
      apikey: TM_API_KEY!,
      countryCode: 'BE',
      classificationName: 'music',
      size: String(pageSize),
      sort: 'date,asc',
      page: String(page),
    });

    const res = await fetch(`${BASE_URL}/events.json?${params}`);

    if (!res.ok) {
      console.error(`❌  Ticketmaster API fout: ${res.status} ${res.statusText}`);
      break;
    }

    const data: TmPage = await res.json();
    if (!data._embedded?.events) break;

    allEvents.push(...data._embedded.events);
    console.log(`   Pagina ${page + 1}/${data.page.totalPages} — ${data._embedded.events.length} events opgehaald`);

    if (page + 1 >= data.page.totalPages) break;
    page++;
  }

  return allEvents;
}

// ── Extract & upsert helpers ───────────────────────────

function extractVenues(tmEvents: TmEvent[]) {
  const map = new Map<string, TmVenue>();
  for (const ev of tmEvents) {
    const v = ev._embedded?.venues?.[0];
    if (v?.id && !map.has(v.id)) map.set(v.id, v);
  }
  return [...map.values()].map((v) => {
    const bestImage = v.images?.slice().sort((a, b) => b.width - a.width)[0];
    return {
      id: v.id,
      name: v.name,
      city: v.city?.name ?? null,
      address: v.address?.line1 ?? null,
      image_url: bestImage?.url ?? null,
      latitude: v.location?.latitude ? parseFloat(v.location.latitude) : null,
      longitude: v.location?.longitude ? parseFloat(v.location.longitude) : null,
    };
  });
}

function extractArtists(tmEvents: TmEvent[]) {
  const map = new Map<string, TmAttraction>();
  for (const ev of tmEvents) {
    for (const a of ev._embedded?.attractions ?? []) {
      if (a.id && !map.has(a.id)) map.set(a.id, a);
    }
  }
  return [...map.values()].map((a) => {
    const bestImage = a.images?.slice().sort((a, b) => b.width - a.width)[0];
    const genre =
      a.classifications?.[0]?.genre?.name && a.classifications[0].genre.name !== 'Undefined'
        ? a.classifications[0].genre.name
        : a.classifications?.[0]?.segment?.name ?? null;
    return {
      id: a.id,
      name: a.name,
      image_url: bestImage?.url ?? null,
      genre,
    };
  });
}

function toEventRow(tm: TmEvent) {
  const venue = tm._embedded?.venues?.[0];
  const rawTime = tm.dates.start.localTime ?? '';
  const dateStr = tm.dates.start.localDate;
  const time = rawTime.length >= 5 ? rawTime.slice(0, 5) : rawTime;

  const dateTimeStr = dateStr && time ? `${dateStr}T${time}` : dateStr;
  const locationParts = [venue?.name, venue?.city?.name].filter(Boolean);

  return {
    id: tm.id,
    name: tm.name,
    date: dateTimeStr ? new Date(dateTimeStr).toISOString() : null,
    location_name: locationParts.length > 0 ? locationParts.join(', ') : null,
    image_url: tm.images?.[0]?.url ?? null,
    venue_id: venue?.id ?? null,
    city: venue?.city?.name ?? null,
    time: time || null,
    url: tm.url ?? null,
    latitude: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
    longitude: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
  };
}

async function upsertBatched(table: string, rows: Record<string, unknown>[]) {
  const batchSize = 500;
  let ok = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`   ❌  ${table} batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    } else {
      ok += batch.length;
    }
  }
  return ok;
}

// ── Main ───────────────────────────────────────────────

async function main() {
  console.log('🎵  Concert Buddy — Event Sync');
  console.log('─'.repeat(40));

  // 1. Haal alle events op
  console.log('⏳  Events ophalen van Ticketmaster...');
  const tmEvents = await fetchAllEvents();
  console.log(`✅  ${tmEvents.length} events opgehaald\n`);

  if (tmEvents.length === 0) {
    console.log('Geen events gevonden, klaar.');
    return;
  }

  // 2. Upsert venues (eerst, want events refereren ernaar)
  const venueRows = extractVenues(tmEvents);
  const venuesOk = await upsertBatched('venues', venueRows);
  console.log(`✅  ${venuesOk}/${venueRows.length} venues ge-upsert`);

  // 3. Upsert artists
  const artistRows = extractArtists(tmEvents);
  const artistsOk = await upsertBatched('artists', artistRows);
  console.log(`✅  ${artistsOk}/${artistRows.length} artiesten ge-upsert`);

  // 4. Upsert events
  const eventRows = tmEvents.map(toEventRow);
  const eventsOk = await upsertBatched('events', eventRows);
  console.log(`✅  ${eventsOk}/${eventRows.length} events ge-upsert`);

  console.log('\n🎉  Sync voltooid!');
}

main().catch((err) => {
  console.error('❌  Onverwachte fout:', err);
  process.exit(1);
});
