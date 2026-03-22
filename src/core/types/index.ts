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

// Simplified event for app
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

// Artist from Ticketmaster API
export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  genre: string;
}

// Venue from Ticketmaster
export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  imageUrl: string;
  latitude: number | null;
  longitude: number | null;
}

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
  role: 'user' | 'admin';
  blocked_at: string | null;
  push_token: string | null;
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

export interface Group {
  id: string;
  event_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  vibe_focus: string | null;
  max_members: number;
  created_at: string;
  meeting_point_lat: number | null;
  meeting_point_lng: number | null;
  meeting_point_name: string | null;
  member_count?: number;
  is_member?: boolean;
}

export interface FilterState {
  groupsOnly: boolean;
  minGroupSize: string;
  maxGroupSize: string;
  startDate: Date | null;
  endDate: Date | null;
}

