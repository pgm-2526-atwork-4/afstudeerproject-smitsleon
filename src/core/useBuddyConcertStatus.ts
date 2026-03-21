import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getBuddyIds } from './utils';

export interface BuddyStatus {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  status: 'interested' | 'going';
}

/**
 * Fetches the concert status of the current user's buddies for a given event.
 */
export function useBuddyConcertStatus(userId: string | undefined, eventId: string | undefined) {
  const [buddyStatuses, setBuddyStatuses] = useState<BuddyStatus[]>([]);

  useEffect(() => {
    if (!userId || !eventId) return;

    (async () => {
      const buddyIds = await getBuddyIds(userId);
      if (buddyIds.length === 0) { setBuddyStatuses([]); return; }

      const { data: statusRows } = await supabase
        .from('concert_status')
        .select('user_id, status')
        .eq('event_id', eventId)
        .in('user_id', buddyIds);

      if (!statusRows || statusRows.length === 0) { setBuddyStatuses([]); return; }

      const userIds = statusRows.map((r: any) => r.user_id);
      const { data: userRows } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);

      const userMap = new Map((userRows ?? []).map((u: any) => [u.id, u]));
      setBuddyStatuses(
        statusRows.map((r: any) => {
          const u = userMap.get(r.user_id);
          return {
            id: r.user_id,
            first_name: u?.first_name ?? '',
            last_name: u?.last_name ?? '',
            avatar_url: u?.avatar_url ?? null,
            status: r.status,
          };
        })
      );
    })();
  }, [userId, eventId]);

  return buddyStatuses;
}
