/**
 * Handmatige Supabase-tabeltypen afgeleid van het database schema.
 * Vervangt `as any` casts bij Supabase-queries.
 */

import type { Group, UserProfile } from '.';

export type DbUser = UserProfile;

export type DbGroup = Omit<Group, 'member_count' | 'is_member'>;

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

export interface DbGroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
  role: 'admin' | 'member';
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

// ── Joined query result helpers ────────────────────────

export interface DbMessageWithUser extends DbMessage {
  users: Pick<DbUser, 'first_name' | 'last_name' | 'avatar_url'> | null;
}

export interface DbGroupWithEvent extends DbGroup {
  events: Pick<DbEvent, 'name' | 'image_url' | 'date' | 'location_name' | 'city'> | null;
  member_count: { count: number }[];
}

export interface DbBuddyRequestWithUser extends DbBuddyRequest {
  users: Pick<DbUser, 'first_name' | 'last_name' | 'avatar_url'> | null;
}

// ── Lightweight pick types for common query patterns ───

/** concert_status row when selecting only event_id */
export type ConcertStatusEventId = Pick<DbConcertStatus, 'event_id'>;

/** concert_status row when selecting user_id + status */
export type ConcertStatusUserStatus = Pick<DbConcertStatus, 'user_id' | 'status'>;

/** favourite_artists joined with artists(name) */
export interface FavArtistWithName {
  artists: Pick<DbArtist, 'name'> | null;
}

/** favourite_venues selecting only venue_id */
export type FavVenueId = Pick<DbFavouriteVenue, 'venue_id'>;

/** groups selecting only event_id */
export type GroupEventId = Pick<DbGroup, 'event_id'>;

/** group_members selecting only group_id */
export type GroupMemberGroupId = Pick<DbGroupMember, 'group_id'>;

/** group_members selecting only user_id */
export type GroupMemberUserId = Pick<DbGroupMember, 'user_id'>;

/** group_members joined with users profile info */
export interface GroupMemberWithUser {
  user_id: string;
  joined_at: string;
  role: 'admin' | 'member';
  users: Pick<DbUser, 'first_name' | 'last_name' | 'avatar_url'> | null;
}

/** event_artists joined with full artist info */
export interface EventArtistWithArtist {
  artist_id: string;
  artists: Pick<DbArtist, 'id' | 'name' | 'image_url' | 'genre'>;
}

/** favourite_artists joined with artists(name) + user_id (for people search) */
export interface FavArtistWithUserAndName extends FavArtistWithName {
  user_id: string;
}

/** favourite_artists joined with full artist info */
export interface FavArtistWithFullArtist {
  artist_id: string;
  artists: Pick<DbArtist, 'id' | 'name' | 'image_url' | 'genre'> | null;
}

/** favourite_venues joined with full venue info */
export interface FavVenueWithFullVenue {
  venue_id: string;
  venues: Pick<DbVenue, 'id' | 'name' | 'city' | 'image_url'> | null;
}

/** group_members joined with groups + events (chat list) */
export interface GroupMemberWithGroupDetail {
  group_id: string;
  joined_at: string;
  groups: {
    id: string;
    title: string;
    description: string | null;
    max_members: number;
    created_by: string | null;
    event_id: string;
    member_count: { count: number }[];
    events: Pick<DbEvent, 'name' | 'image_url' | 'date' | 'location_name'> | null;
  } | null;
}

/** buddies row selecting user_id_1, user_id_2 */
export interface BuddyPair {
  user_id_1: string;
  user_id_2: string;
}

/** users row for buddy status display */
export type UserBasicInfo = Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;

/** groups query result with aggregated member_count */
export interface GroupWithMemberCount extends DbGroup {
  member_count: { count: number }[];
}
