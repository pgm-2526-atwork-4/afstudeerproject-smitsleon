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
    venues?: { name: string; city?: { name: string } }[];
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
  city: string;
  imageUrl: string;
  url?: string;
}

// User profile stored in Supabase
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  city: string | null;
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
