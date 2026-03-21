import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from './supabase';

export interface LiveLocationData {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  expires_at: string;
  updated_at: string;
}

interface Opts {
  userId: string | undefined;
  groupId?: string;
  otherUserId?: string;
  sendMessage: (content: string) => Promise<void>;
}

export function useLiveLocation({ userId, groupId, otherUserId, sendMessage }: Opts) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLiveId, setActiveLiveId] = useState<string | null>(null);
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLocationData>>({});
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    const isGroup = !!groupId;

    // --- Fetch active live locations ---
    const query = supabase
      .from('live_locations')
      .select('id, user_id, latitude, longitude, expires_at, updated_at')
      .gt('expires_at', new Date().toISOString());

    if (isGroup) {
      query.eq('group_id', groupId!);
    } else if (otherUserId) {
      query.or(
        `and(user_id.eq.${userId},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${userId})`,
      );
    }

    query.then(({ data }) => {
      if (!data) return;
      const map: Record<string, LiveLocationData> = {};
      data.forEach((l) => { map[l.id] = l; });
      setLiveLocations(map);
      const mine = data.find((l) => l.user_id === userId);
      if (mine) {
        setActiveLiveId(mine.id);
        startWatch(mine.id);
      }
    });

    // --- Realtime subscription ---
    const channelName = isGroup ? `live-loc-g-${groupId}` : `live-loc-p-${[userId, otherUserId].sort().join('-')}`;
    const channelBuilder = supabase.channel(channelName);

    if (isGroup) {
      channelBuilder.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_locations', filter: `group_id=eq.${groupId}` },
        handlePayload,
      );
    } else {
      // Private chat — subscribe broadly and filter client-side
      channelBuilder.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_locations' },
        (payload) => {
          const loc = payload.eventType === 'DELETE' ? payload.old : payload.new;
          const relevant =
            (loc.user_id === userId && loc.receiver_id === otherUserId) ||
            (loc.user_id === otherUserId && loc.receiver_id === userId);
          if (relevant) handlePayload(payload);
        },
      );
    }
    channelBuilder.subscribe();

    function handlePayload(payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) {
      if (payload.eventType === 'DELETE') {
        setLiveLocations((prev) => {
          const next = { ...prev };
          delete next[payload.old.id];
          return next;
        });
      } else {
        const loc = payload.new as LiveLocationData;
        setLiveLocations((prev) => ({ ...prev, [loc.id]: loc }));
      }
    }

    return () => {
      supabase.removeChannel(channelBuilder);
      watchRef.current?.remove();
    };
  }, [userId, groupId, otherUserId]);

  function startWatch(liveId: string) {
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 10 },
      async (loc) => {
        await supabase
          .from('live_locations')
          .update({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            updated_at: new Date().toISOString(),
          })
          .eq('id', liveId);
      },
    ).then((sub) => {
      watchRef.current = sub;
    });
  }

  async function shareCurrentLocation() {
    setShowModal(false);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Geen toegang', 'Geef toegang tot je locatie om deze te delen.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await sendMessage(`📍 ${loc.coords.latitude},${loc.coords.longitude}`);
    } catch {
      Alert.alert('Fout', 'Kon je locatie niet ophalen.');
    } finally {
      setLoading(false);
    }
  }

  async function shareLiveLocation(minutes: number) {
    setShowModal(false);
    if (!userId) return;
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Geen toegang', 'Geef toegang tot je locatie om deze te delen.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      const insert: {
        user_id: string;
        latitude: number;
        longitude: number;
        expires_at: string;
        group_id?: string;
        receiver_id?: string;
      } = {
        user_id: userId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        expires_at: expiresAt,
      };
      if (groupId) insert.group_id = groupId;
      if (otherUserId) insert.receiver_id = otherUserId;

      const { data, error } = await supabase
        .from('live_locations')
        .insert(insert)
        .select('id')
        .single();

      if (error || !data) throw error;
      await sendMessage(`📍LIVE:${data.id}`);
      setActiveLiveId(data.id);
      startWatch(data.id);
    } catch (e) {
      console.error('Live location error:', e);
      Alert.alert('Fout', 'Kon live locatie niet starten.');
    } finally {
      setLoading(false);
    }
  }

  async function stopSharing() {
    if (!activeLiveId) return;
    watchRef.current?.remove();
    watchRef.current = null;
    await supabase
      .from('live_locations')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', activeLiveId);
    setActiveLiveId(null);
  }

  return {
    showModal,
    setShowModal,
    loading,
    activeLiveId,
    liveLocations,
    shareCurrentLocation,
    shareLiveLocation,
    stopSharing,
  };
}
