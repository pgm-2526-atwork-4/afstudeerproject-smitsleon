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
          };
        })
        .filter(Boolean) as GroupWithEvent[];
      setGroups(parsed);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchMyGroups(); }, [fetchMyGroups]));

  function renderGroup({ item }: { item: GroupWithEvent }) {
    const isAdmin = item.created_by === user?.id;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: '/group/[id]',
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
          {item.description ? (
            <Text style={styles.groupDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.memberBadge}>
              <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.memberBadgeText}>{item.member_count}/{item.max_members}</Text>
            </View>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                <Text style={styles.adminBadgeText}>Beheerder</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
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
  cardInfo: { flex: 1, gap: 4, paddingVertical: Spacing.sm },
  groupTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  groupDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberBadgeText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  adminBadgeText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
});

