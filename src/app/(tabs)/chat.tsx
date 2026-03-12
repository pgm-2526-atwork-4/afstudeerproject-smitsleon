import { UserAvatar } from '@/components/design/UserAvatar';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Unified chat item for both group chats and private chats
interface ChatItem {
  id: string;
  type: 'group' | 'private';
  title: string;
  image_url: string | null;
  last_message: string | null;
  last_message_sender: string | null;
  last_message_sender_id: string | null;
  last_message_time: string | null;
  // Group-specific
  event_id?: string;
  event_name?: string;
  event_date?: string | null;
  event_location?: string | null;
  description?: string | null;
  max_members?: number;
  created_by?: string;
  event_image_url?: string | null;
  // Private-specific
  buddy_user_id?: string;
  buddy_first_name?: string;
  buddy_last_name?: string;
  buddy_avatar_url?: string | null;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [readTimes, setReadTimes] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<'all' | 'group' | 'private'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = useCallback(async (isRefresh = false) => {
    if (!user) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const items: ChatItem[] = [];

    // 1. Fetch group chats
    const { data: groupData } = await supabase
      .from('group_members')
      .select(`
        group_id,
        joined_at,
        groups (
          id,
          title,
          description,
          max_members,
          created_by,
          event_id,
          member_count:group_members(count),
          events (
            name,
            image_url,
            date,
            location_name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    const groupItems: ChatItem[] = (groupData ?? [])
      .map((row: any) => {
        const g = row.groups;
        if (!g) return null;
        return {
          id: g.id,
          type: 'group' as const,
          title: g.title,
          image_url: g.events?.image_url ?? null,
          last_message: null,
          last_message_sender: null,
          last_message_sender_id: null,
          last_message_time: null,
          event_id: g.event_id,
          event_name: g.events?.name ?? 'Onbekend concert',
          event_date: g.events?.date ?? null,
          event_location: g.events?.location_name ?? null,
          description: g.description,
          max_members: g.max_members,
          created_by: g.created_by,
          event_image_url: g.events?.image_url ?? null,
        };
      })
      .filter(Boolean) as ChatItem[];

    // Fetch last message per group
    if (groupItems.length > 0) {
      const groupIds = groupItems.map((g) => g.id);
      const { data: msgData } = await supabase
        .from('messages')
        .select(`group_id, content, created_at, user_id, users ( first_name )`)
        .in('group_id', groupIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const lastMessages = new Map<string, { content: string; sender: string; sender_id: string; time: string }>();
      for (const msg of msgData ?? []) {
        if (!lastMessages.has(msg.group_id)) {
          const msgUser = Array.isArray(msg.users) ? msg.users[0] : msg.users;
          lastMessages.set(msg.group_id, {
            content: msg.content,
            sender: msgUser?.first_name ?? '',
            sender_id: msg.user_id,
            time: msg.created_at,
          });
        }
      }
      for (const group of groupItems) {
        const last = lastMessages.get(group.id);
        if (last) {
          group.last_message = last.content;
          group.last_message_sender = last.sender;
          group.last_message_sender_id = last.sender_id;
          group.last_message_time = last.time;
        }
      }
    }
    items.push(...groupItems);

    // 2. Fetch private chats (conversations with buddies where at least 1 message exists)
    const { data: pmData } = await supabase
      .from('private_messages')
      .select('id, sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (pmData && pmData.length > 0) {
      // Group by conversation partner
      const convos = new Map<string, { content: string; time: string; sender_id: string }>();
      for (const msg of pmData ?? []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convos.has(partnerId)) {
          convos.set(partnerId, { content: msg.content, time: msg.created_at, sender_id: msg.sender_id });
        }
      }

      // Fetch partner user info
      const partnerIds = Array.from(convos.keys());
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', partnerIds);

      for (const partner of usersData ?? []) {
        const lastMsg = convos.get(partner.id);
        items.push({
          id: `pm-${partner.id}`,
          type: 'private',
          title: `${partner.first_name} ${partner.last_name}`,
          image_url: partner.avatar_url ?? null,
          last_message: lastMsg?.content ?? null,
          last_message_sender: partner.first_name,
          last_message_sender_id: lastMsg?.sender_id ?? null,
          last_message_time: lastMsg?.time ?? null,
          buddy_user_id: partner.id,
          buddy_first_name: partner.first_name,
          buddy_last_name: partner.last_name,
          buddy_avatar_url: partner.avatar_url ?? null,
        });
      }
    }

    // Sort all items by last message time
    items.sort((a, b) => {
      const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
      const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
      return timeB - timeA;
    });

    setChatItems(items);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => {
    fetchChats().then(async () => {
      // Load AsyncStorage read timestamps after chats are fetched
      setChatItems((prev) => {
        const keys = prev.map((c) => `chat_read:${c.id}`);
        AsyncStorage.multiGet(keys).then((stored) => {
          const times: Record<string, number> = {};
          for (const [key, val] of stored) {
            const id = key.replace('chat_read:', '');
            times[id] = val ? parseInt(val, 10) : 0;
          }
          setReadTimes(times);
        });
        return prev;
      });
    });
  }, [fetchChats]));

  function formatMessageTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Gisteren';
    }
    return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });
  }

  async function handlePress(item: ChatItem) {
    await AsyncStorage.setItem(`chat_read:${item.id}`, String(Date.now()));
    setReadTimes((prev) => ({ ...prev, [item.id]: Date.now() }));
    if (item.type === 'group') {
      router.push({
        pathname: '/group/chat',
        params: {
          id: item.id,
          title: item.title,
          description: item.description ?? '',
          max_members: String(item.max_members ?? 0),
          created_by: item.created_by ?? '',
          event_id: item.event_id ?? '',
          event_name: item.event_name ?? '',
          event_image_url: item.event_image_url ?? '',
          event_date: item.event_date ?? '',
          event_location: item.event_location ?? '',
        },
      });
    } else {
      router.push({
        pathname: '/private-chat',
        params: {
          userId: item.buddy_user_id!,
          firstName: item.buddy_first_name!,
          lastName: item.buddy_last_name!,
          avatarUrl: item.buddy_avatar_url ?? '',
        },
      });
    }
  }

  function renderChatItem({ item }: { item: ChatItem }) {
    const initials = item.type === 'private'
      ? `${(item.buddy_first_name ?? '').charAt(0)}${(item.buddy_last_name ?? '').charAt(0)}`.toUpperCase()
      : '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => handlePress(item)}
      >
        {/* Image / Avatar */}
        <View style={styles.cardImageWrapper}>
          {item.type === 'group' ? (
            item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                <Ionicons name="musical-notes" size={24} color={Colors.textMuted} />
              </View>
            )
          ) : (
            <UserAvatar uri={item.image_url} initials={initials} size={52} />
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Ionicons
              name={item.type === 'group' ? 'people' : 'person'}
              size={14}
              color={Colors.textMuted}
            />
            <Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text>
          </View>
          {(() => {
            const isUnread = item.last_message_time && item.last_message_sender_id !== user?.id
              ? new Date(item.last_message_time).getTime() > (readTimes[item.id] ?? 0)
              : false;
            return item.last_message ? (
              <Text
                style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
                numberOfLines={1}
              >
                {item.last_message_sender ? (
                  <Text style={[styles.lastMessageSender, isUnread && styles.lastMessageUnread]}>
                    {item.last_message_sender_id === user?.id ? 'Jij' : item.last_message_sender}:{' '}
                  </Text>
                ) : null}
                {item.last_message}
              </Text>
            ) : (
              <Text style={styles.lastMessage} numberOfLines={1}>Nog geen berichten</Text>
            );
          })()}
        </View>

        {/* Time + chevron */}
        <View style={styles.cardRight}>
          {item.last_message_time ? (
            <Text style={styles.timeText}>{formatMessageTime(item.last_message_time)}</Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Berichten</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>Alle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'group' && styles.filterBtnActive]}
            onPress={() => setFilter('group')}
          >
            <Text style={[styles.filterBtnText, filter === 'group' && styles.filterBtnTextActive]}>Groepen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'private' && styles.filterBtnActive]}
            onPress={() => setFilter('private')}
          >
            <Text style={[styles.filterBtnText, filter === 'private' && styles.filterBtnTextActive]}>Privé</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filter === 'all' ? chatItems : chatItems.filter((c) => c.type === filter)}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={chatItems.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchChats(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nog geen berichten</Text>
              <Text style={styles.emptySubtitle}>
                Sluit je aan bij een groep of stuur een buddy een bericht.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold' },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
  },
  filterBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: Colors.primary,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyTitle: { color: Colors.textSecondary, fontSize: FontSizes.lg, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },
  cardImageWrapper: {
    width: 80,
    height: 80,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardInfo: { flex: 1, gap: 2, paddingVertical: Spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', flex: 1 },
  lastMessage: { color: Colors.textMuted, fontSize: FontSizes.sm },
  lastMessageUnread: { color: Colors.text, fontWeight: 'bold' },
  lastMessageSender: { color: Colors.textSecondary, fontWeight: '600' },
  cardRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  timeText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
});
