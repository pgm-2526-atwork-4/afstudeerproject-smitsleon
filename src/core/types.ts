// Ticketmaster API response types
export interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates: {
    start: {
      localDate?: string;
      localTime?: string;
    };
  };
  images?: { url: string; width: number; height: number }[];
  _embedded?: {
    venues?: {
      id: string;
      name: string;
      city?: { name: string };
      address?: { line1: string };
      location?: { longitude: string; latitude: string };
      images?: { url: string; width: number; height: number }[];
    }[];
  };
}

export interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
}

// Simplified event for our app
export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  venueId: string;
  city: string;
  imageUrl: string;
  url?: string;
}

// Artist from Ticketmaster Attractions API
export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  genre: string;
}

// Venue from Ticketmaster / Supabase
export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  imageUrl: string;
  latitude: number | null;
  longitude: number | null;
}

// User profile stored in Supabase
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  birth_date: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  share_location: boolean;
  vibe_tags: string[];
  created_at: string;
}

export const VIBE_TAGS = [
  'Moshen',
  'Chill',
  'Vooraan staan',
  'Backstage vibes',
  'Zingen',
  'Dansen',
  "Foto's",
  'VIP',
  'Foodtrucks',
] as const;

// Group stored in Supabase
export interface Group {
  id: string;
  event_id: string;
  created_by: string;
  title: string;
  description: string | null;
  vibe_focus: string | null;
  max_members: number;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

/** Convert a Supabase events row to the app's Event type */
export function dbRowToEvent(e: { id: string; name: string; date: string | null; time: string | null; location_name: string | null; venue_id: string | null; city: string | null; image_url: string | null; url: string | null }): Event {
  return {
    id: e.id,
    name: e.name,
    date: e.date ? e.date.split('T')[0] : '',
    time: e.time ?? '',
    venue: e.location_name ?? 'Onbekend',
    venueId: e.venue_id ?? '',
    city: e.city ?? '',
    imageUrl: e.image_url ?? '',
    url: e.url ?? undefined,
  };
}

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export interface FilterState {
  groupsOnly: boolean;
  minGroupSize: string;
  maxGroupSize: string;
  startDate: Date | null;
  endDate: Date | null;
}

