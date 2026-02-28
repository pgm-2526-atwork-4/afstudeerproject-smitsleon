import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
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

interface GroupWithEvent {
  id: string;
  title: string;
  description: string | null;
  max_members: number;
  created_by: string;
  member_count: number;
  event_id: string;
  event_name: string;
  event_image_url: string | null;
  event_date: string | null;
  event_location: string | null;
  last_message: string | null;
  last_message_sender: string | null;
  last_message_time: string | null;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyGroups = useCallback(async (isRefresh = false) => {
    if (!user) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
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

    if (error) {
      console.error('Error fetching groups:', error);
    } else {
      const parsed: GroupWithEvent[] = (data ?? [])
        .map((row: any) => {
          const g = row.groups;
          if (!g) return null;
          return {
            id: g.id,
            title: g.title,
            description: g.description,
            max_members: g.max_members,
            created_by: g.created_by,
            event_id: g.event_id,
            member_count: g.member_count?.[0]?.count ?? 0,
            event_name: g.events?.name ?? 'Onbekend concert',
            event_image_url: g.events?.image_url ?? null,
            event_date: g.events?.date ?? null,
            event_location: g.events?.location_name ?? null,
            last_message: null,
            last_message_sender: null,
            last_message_time: null,
          };
        })
        .filter(Boolean) as GroupWithEvent[];

      // Fetch last message for each group
      if (parsed.length > 0) {
        const groupIds = parsed.map((g) => g.id);
        const { data: msgData } = await supabase
          .from('messages')
          .select(`
            group_id,
            content,
            created_at,
            users (
              first_name
            )
          `)
          .in('group_id', groupIds)
          .order('created_at', { ascending: false });

        // Take the first (most recent) message per group
        const lastMessages = new Map<string, { content: string; sender: string; time: string }>();
        for (const msg of (msgData ?? []) as any[]) {
          if (!lastMessages.has(msg.group_id)) {
            lastMessages.set(msg.group_id, {
              content: msg.content,
              sender: msg.users?.first_name ?? '',
              time: msg.created_at,
            });
          }
        }

        for (const group of parsed) {
          const last = lastMessages.get(group.id);
          if (last) {
            group.last_message = last.content;
            group.last_message_sender = last.sender;
            group.last_message_time = last.time;
          }
        }

        // Sort: groups with recent messages first, then by joined_at
        parsed.sort((a, b) => {
          const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
          const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
          return timeB - timeA;
        });
      }

      setGroups(parsed);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchMyGroups(); }, [fetchMyGroups]));

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

  function renderGroup({ item }: { item: GroupWithEvent }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: '/group/chat',
            params: {
              id: item.id,
              title: item.title,
              description: item.description ?? '',
              max_members: String(item.max_members),
              created_by: item.created_by,
              event_id: item.event_id,
              event_name: item.event_name,
              event_image_url: item.event_image_url ?? '',
              event_date: item.event_date ?? '',
              event_location: item.event_location ?? '',
            },
          })
        }
      >
        {/* Concert image thumbnail */}
        <View style={styles.cardImageWrapper}>
          {item.event_image_url ? (
            <Image source={{ uri: item.event_image_url }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="musical-notes" size={24} color={Colors.textMuted} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.groupTitle} numberOfLines={1}>{item.title}</Text>
          {item.last_message ? (
            <Text style={styles.lastMessage} numberOfLines={1}>
              <Text style={styles.lastMessageSender}>{item.last_message_sender}: </Text>
              {item.last_message}
            </Text>
          ) : (
            <Text style={styles.lastMessage} numberOfLines={1}>Nog geen berichten</Text>
          )}
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
        <Text style={styles.title}>Mijn groepen</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={groups.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchMyGroups(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nog geen groepen</Text>
              <Text style={styles.emptySubtitle}>
                Ga naar een concert en sluit je aan bij een groep of maak er zelf een aan.
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
  },
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold' },
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
  groupTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  lastMessage: { color: Colors.textMuted, fontSize: FontSizes.sm },
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

