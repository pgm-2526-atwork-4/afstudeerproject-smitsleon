/**
 * Handmatige Supabase-tabeltypen afgeleid van het database schema.
 * Vervangt `as any` casts bij Supabase-queries.
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

export interface DbGroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface DbMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

export interface DbPrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

export interface DbBuddyRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
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

export interface DbConcertStatus {
  user_id: string;
  event_id: string;
  status: 'interested' | 'going';
  created_at: string;
}

export interface DbLiveLocation {
  id: string;
  user_id: string;
  group_id: string | null;
  receiver_id: string | null;
  latitude: number;
  longitude: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbFavouriteArtist {
  user_id: string;
  artist_id: string;
  created_at: string;
}

export interface DbFavouriteVenue {
  user_id: string;
  venue_id: string;
  created_at: string;
}

// ── Joined query result helpers ────────────────────────

export interface DbMessageWithUser extends DbMessage {
  users: Pick<DbUser, 'first_name' | 'last_name' | 'avatar_url'> | null;
}

export interface DbGroupWithEvent extends DbGroup {
  events: Pick<DbEvent, 'name' | 'image_url' | 'date' | 'location_name'> | null;
  member_count: { count: number }[];
}

export interface DbBuddyRequestWithUser extends DbBuddyRequest {
  users: Pick<DbUser, 'first_name' | 'last_name' | 'avatar_url'> | null;
}
