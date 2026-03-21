import { supabase } from './supabase';

/**
 * Haversine formula — returns the distance in km between two lat/lng points.
 */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetches the IDs of all accepted buddies for a given user.
 */
export async function getBuddyIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('buddies')
    .select('user_id_1, user_id_2')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

  return (data ?? []).map((row: { user_id_1: string; user_id_2: string }) =>
    row.user_id_1 === userId ? row.user_id_2 : row.user_id_1
  );
}
