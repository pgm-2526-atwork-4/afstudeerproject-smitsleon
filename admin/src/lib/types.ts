/**
 * Database types for the Concert Buddy Admin panel.
 * Based on the mobile app's database.types.ts, extended with admin-specific fields.
 */

export interface DbUser {
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

export interface DbEvent {
  id: string;
  name: string;
  date: string | null;
  location_name: string | null;
  image_url: string | null;
  venue_id: string | null;
  city: string | null;
  time: string | null;
  url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface DbArtist {
  id: string;
  name: string;
  image_url: string | null;
  genre: string | null;
  created_at: string;
}

export interface DbVenue {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface DbGroup {
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
}

export interface DbEventArtist {
  event_id: string;
  artist_id: string;
}

export type ReportReason = 'spam' | 'ongepast_gedrag' | 'nep_profiel' | 'intimidatie' | 'andere';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface DbReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}
