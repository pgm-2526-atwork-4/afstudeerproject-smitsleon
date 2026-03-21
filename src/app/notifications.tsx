import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { UserAvatar } from '@/components/design/UserAvatar';
import { useAuth } from '@/core/context/AuthContext';
import { notifyUsers } from '@/core/lib/pushNotifications';
import { supabase } from '@/core/lib/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Unified notification item
interface NotifItem {
  id: string;
  itemType: 'buddy_request' | 'notification';
  from_user_id?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  type?: string;
  title?: string;
  body?: string;
  data?: any;
  read: boolean;
  created_at: string;
  localStatus?: 'pending' | 'accepted';
  // Populated for buddy_accepted notifications
  accepter_first_name?: string;
  accepter_last_name?: string;
  accepter_avatar_url?: string | null;
  // Populated for group_joined notifications
  joiner_first_name?: string;
  joiner_last_name?: string;
  joiner_avatar_url?: string | null;
  // Populated for buddy_group_created notifications
  creator_first_name?: string;
  creator_last_name?: string;
  creator_avatar_url?: string | null;
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Net nu';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minuut' : 'minuten'} geleden`;
  if (diffHours < 24) return `${diffHours} uur geleden`;
  if (diffDays === 1) return 'Gisteren';
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  return new Date(dateStr).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });
}

function typeIcon(type: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case 'buddy_accepted': return { name: 'people', color: Colors.primary };
    case 'group_joined': return { name: 'person-add', color: Colors.primary };
    case 'buddy_group_created': return { name: 'people-circle', color: Colors.primary };
    default: return { name: 'notifications', color: Colors.textSecondary };
  }
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!user) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const [requestsRes, notifsRes] = await Promise.all([
      supabase
        .from('buddy_requests')
        .select(`id, from_user_id, status, created_at, users!buddy_requests_from_user_id_fkey(first_name, last_name, avatar_url)`)
        .eq('to_user_id', user.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false }),
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const buddyItems: NotifItem[] = (requestsRes.data ?? []).map((row: any) => ({
      id: `br-${row.id}`,
      itemType: 'buddy_request',
      from_user_id: row.from_user_id,
      first_name: row.users?.first_name ?? '',
      last_name: row.users?.last_name ?? '',
      avatar_url: row.users?.avatar_url ?? null,
      read: row.status === 'accepted',
      created_at: row.created_at,
      localStatus: row.status === 'accepted' ? 'accepted' : undefined,
      data: { request_id: row.id },
    }));

    // Fetch user info for buddy_accepted (accepter) and group_joined (joiner) notifications
    const userInfoMap: Record<string, { first_name: string; last_name: string; avatar_url: string | null }> = {};
    const extraUserIds = Array.from(new Set([
      ...(notifsRes.data ?? [])
        .filter((n: any) => n.type === 'buddy_accepted' && n.data?.accepter_user_id)
        .map((n: any) => n.data.accepter_user_id as string),
      ...(notifsRes.data ?? [])
        .filter((n: any) => n.type === 'group_joined' && n.data?.joiner_user_id)
        .map((n: any) => n.data.joiner_user_id as string),
      ...(notifsRes.data ?? [])
        .filter((n: any) => n.type === 'buddy_group_created' && n.data?.creator_user_id)
        .map((n: any) => n.data.creator_user_id as string),
    ]));
    if (extraUserIds.length > 0) {
      const { data: extraUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', extraUserIds);
      for (const u of extraUsers ?? []) {
        userInfoMap[u.id] = { first_name: u.first_name, last_name: u.last_name, avatar_url: u.avatar_url ?? null };
      }
    }

    const notifItems: NotifItem[] = (notifsRes.data ?? []).map((row: any) => {
      const accepter = row.type === 'buddy_accepted' && row.data?.accepter_user_id
        ? userInfoMap[row.data.accepter_user_id]
        : undefined;
      const joiner = row.type === 'group_joined' && row.data?.joiner_user_id
        ? userInfoMap[row.data.joiner_user_id]
        : undefined;
      const creator = row.type === 'buddy_group_created' && row.data?.creator_user_id
        ? userInfoMap[row.data.creator_user_id]
        : undefined;
      return {
        id: `n-${row.id}`,
        itemType: 'notification',
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data,
        read: row.read,
        created_at: row.created_at,
        accepter_first_name: accepter?.first_name,
        accepter_last_name: accepter?.last_name,
        accepter_avatar_url: accepter?.avatar_url ?? null,
        joiner_first_name: joiner?.first_name,
        joiner_last_name: joiner?.last_name,
        joiner_avatar_url: joiner?.avatar_url ?? null,
        creator_first_name: creator?.first_name,
        creator_last_name: creator?.last_name,
        creator_avatar_url: creator?.avatar_url ?? null,
      };
    });

    // Merge and sort newest-first
    const merged = [...buddyItems, ...notifItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setItems(merged);

    // Mark all unread notifications as read in DB, then mirror in local state
    const unreadIds = (notifsRes.data ?? [])
      .filter((n: any) => !n.read)
      .map((n: any) => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      setItems((prev) =>
        prev.map((i) => i.itemType === 'notification' ? { ...i, read: true } : i)
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  async function handleAccept(item: NotifItem) {
    const requestId = item.data?.request_id;
    if (!requestId) return;
    setProcessingId(item.id);
    const { error } = await supabase.rpc('accept_buddy_request', { request_id: requestId });
    if (error) {
      Alert.alert('Fout', 'Kon verzoek niet accepteren. Probeer opnieuw.');
    } else {
      setItems((prev) =>
        prev.map((i) => i.id === item.id ? { ...i, localStatus: 'accepted', read: true } : i)
      );
      // Notify the requester
      await notifyUsers([{
        user_id: item.from_user_id!,
        type: 'buddy_accepted',
        title: 'Buddy verzoek geaccepteerd',
        body: 'Je buddy verzoek is geaccepteerd! Jullie zijn nu buddies.',
        data: { accepter_user_id: user?.id },
      }]);
    }
    setProcessingId(null);
  }

  async function handleDecline(item: NotifItem) {
    const requestId = item.data?.request_id;
    if (!requestId) return;
    setProcessingId(item.id);
    const { error } = await supabase.rpc('decline_buddy_request', { request_id: requestId });
    if (error) {
      Alert.alert('Fout', 'Kon verzoek niet weigeren. Probeer opnieuw.');
    } else {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setProcessingId(null);
  }

  function renderItem({ item }: { item: NotifItem }) {
    const isProcessing = processingId === item.id;
    const isUnread = !item.read;

    if (item.itemType === 'buddy_request') {
      const initials = `${(item.first_name ?? '')[0] ?? ''}${(item.last_name ?? '')[0] ?? ''}`.toUpperCase();
      const isAccepted = item.localStatus === 'accepted';

      return (
        <View style={styles.card}>
          {isUnread && <View style={styles.unreadDot} />}
          <TouchableOpacity
            style={styles.cardInfo}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.from_user_id! } })}
          >
            <UserAvatar uri={item.avatar_url ?? null} initials={initials} size={48} />
            <View style={styles.cardText}>
              <Text style={styles.cardName}>{item.first_name} {item.last_name}</Text>
              <Text style={isAccepted ? styles.positiveMsg : styles.neutralMsg}>
                {isAccepted ? 'Jullie zijn nu buddies' : 'Wil jouw buddy worden'}
              </Text>
              <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          </TouchableOpacity>

          {!isAccepted && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleAccept(item)}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <ActivityIndicator size="small" color={Colors.text} />
                  : <Ionicons name="checkmark" size={22} color={Colors.text} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => handleDecline(item)}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <ActivityIndicator size="small" color={Colors.text} />
                  : <Ionicons name="close" size={22} color={Colors.text} />}
              </TouchableOpacity>
            </View>
          )}

          {isAccepted && <Ionicons name="checkmark-circle" size={28} color={Colors.primary} />}
        </View>
      );
    }

    // App notification — buddy_accepted
    if (item.type === 'buddy_accepted') {
      const accepterId = item.data?.accepter_user_id;
      const initials = `${(item.accepter_first_name ?? '')[0] ?? ''}${(item.accepter_last_name ?? '')[0] ?? ''}`.toUpperCase();
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => accepterId && router.push({ pathname: '/user/[id]', params: { id: accepterId } })}
        >
          {isUnread && <View style={styles.unreadDot} />}
          <View style={styles.cardInfo}>
            <UserAvatar uri={item.accepter_avatar_url ?? null} initials={initials} size={48} />
            <View style={styles.cardText}>
              <Text style={styles.cardName}>
                {item.accepter_first_name} {item.accepter_last_name}
              </Text>
              <Text style={styles.positiveMsg}>heeft je buddy verzoek geaccepteerd</Text>
              <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // App notification — group_joined
    if (item.type === 'group_joined') {
      const groupId = item.data?.group_id;
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={async () => {
            if (!groupId) return;
            const { data: g } = await supabase
              .from('groups')
              .select(`id, title, description, max_members, created_by, event_id, events(name, image_url, date, location_name)`)
              .eq('id', groupId)
              .single();
            if (g) {
              const ev = Array.isArray(g.events) ? g.events[0] : g.events;
              router.push({
                pathname: '/group/[id]',
                params: {
                  id: g.id,
                  title: g.title,
                  description: g.description ?? '',
                  max_members: String(g.max_members ?? 6),
                  created_by: g.created_by ?? '',
                  event_id: g.event_id ?? '',
                  event_name: ev?.name ?? '',
                  event_image_url: ev?.image_url ?? '',
                  event_date: ev?.date ?? '',
                  event_location: ev?.location_name ?? '',
                },
              });
            }
          }}
        >
          {isUnread && <View style={styles.unreadDot} />}
          <View style={styles.cardInfo}>
            <UserAvatar
              uri={item.joiner_avatar_url ?? null}
              initials={`${(item.joiner_first_name ?? '')[0] ?? ''}${(item.joiner_last_name ?? '')[0] ?? ''}`.toUpperCase()}
              size={48}
            />
            <View style={styles.cardText}>
              <Text style={styles.cardName}>
                {item.joiner_first_name} {item.joiner_last_name}
              </Text>
              <Text style={styles.neutralMsg}>{item.body}</Text>
              <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // App notification — buddy_group_created
    if (item.type === 'buddy_group_created') {
      const groupId = item.data?.group_id;
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={async () => {
            if (!groupId) return;
            const { data: g } = await supabase
              .from('groups')
              .select(`id, title, description, max_members, created_by, event_id, events(name, image_url, date, location_name)`)
              .eq('id', groupId)
              .single();
            if (g) {
              const ev = Array.isArray(g.events) ? g.events[0] : g.events;
              router.push({
                pathname: '/group/[id]',
                params: {
                  id: g.id,
                  title: g.title,
                  description: g.description ?? '',
                  max_members: String(g.max_members ?? 6),
                  created_by: g.created_by ?? '',
                  event_id: g.event_id ?? '',
                  event_name: ev?.name ?? '',
                  event_image_url: ev?.image_url ?? '',
                  event_date: ev?.date ?? '',
                  event_location: ev?.location_name ?? '',
                },
              });
            }
          }}
        >
          {isUnread && <View style={styles.unreadDot} />}
          <View style={styles.cardInfo}>
            <UserAvatar
              uri={item.creator_avatar_url ?? null}
              initials={`${(item.creator_first_name ?? '')[0] ?? ''}${(item.creator_last_name ?? '')[0] ?? ''}`.toUpperCase()}
              size={48}
            />
            <View style={styles.cardText}>
              <Text style={styles.cardName}>
                {item.creator_first_name} {item.creator_last_name}
              </Text>
              <Text style={styles.neutralMsg}>{item.body}</Text>
              <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Generic fallback
    const icon = typeIcon(item.type ?? '');
    return (
      <View style={styles.card}>
        {isUnread && <View style={styles.unreadDot} />}
        <View style={styles.cardInfo}>
          <View style={styles.notifIconWrapper}>
            <Ionicons name={icon.name} size={24} color={icon.color} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardName}>{item.title}</Text>
            <Text style={styles.neutralMsg}>{item.body}</Text>
            <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Meldingen</Text>
      </View>

      {loading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState icon="notifications-outline" title="Geen meldingen" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  title: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold', flex: 1 },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  unreadDot: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  cardInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardText: { flex: 1 },
  cardName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', marginBottom: 2 },
  neutralMsg: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  positiveMsg: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
  timeText: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: Colors.primary },
  declineBtn: { backgroundColor: Colors.error },
  notifIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
