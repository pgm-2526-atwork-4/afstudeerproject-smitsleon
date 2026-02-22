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

