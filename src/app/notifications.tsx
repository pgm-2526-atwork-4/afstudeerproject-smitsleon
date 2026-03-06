import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { UserAvatar } from '@/components/design/UserAvatar';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
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

interface BuddyRequest {
  id: string;
  from_user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  created_at: string;
  localStatus?: 'pending' | 'accepted';
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

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<BuddyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (!user) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from('buddy_requests')
      .select(`
        id,
        from_user_id,
        status,
        created_at,
        users!buddy_requests_from_user_id_fkey (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('to_user_id', user.id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (!error) {
      setRequests(
        (data ?? []).map((row: any) => ({
          id: row.id,
          from_user_id: row.from_user_id,
          first_name: row.users?.first_name ?? '',
          last_name: row.users?.last_name ?? '',
          avatar_url: row.users?.avatar_url ?? null,
          created_at: row.created_at,
          localStatus: row.status === 'accepted' ? ('accepted' as const) : undefined,
        }))
      );
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  async function handleAccept(requestId: string) {
    setProcessingId(requestId);
    const { error } = await supabase.rpc('accept_buddy_request', { request_id: requestId });
    if (error) {
      Alert.alert('Fout', 'Kon verzoek niet accepteren. Probeer opnieuw.');
    } else {
      setRequests((prev) =>
        prev.map((r) => r.id === requestId ? { ...r, localStatus: 'accepted' as const } : r)
      );
    }
    setProcessingId(null);
  }

  async function handleDecline(requestId: string) {
    setProcessingId(requestId);
    const { error } = await supabase.rpc('decline_buddy_request', { request_id: requestId });
    if (error) {
      Alert.alert('Fout', 'Kon verzoek niet weigeren. Probeer opnieuw.');
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setProcessingId(null);
  }

  function renderRequest({ item }: { item: BuddyRequest }) {
    const initials = `${item.first_name[0] ?? ''}${item.last_name[0] ?? ''}`.toUpperCase();
    const isProcessing = processingId === item.id;
    const isAccepted = item.localStatus === 'accepted';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardInfo}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.from_user_id } })}
        >
          <UserAvatar uri={item.avatar_url} initials={initials} size={48} />
          <View style={styles.cardText}>
            <Text style={styles.cardName}>{item.first_name} {item.last_name}</Text>
            <Text style={isAccepted ? styles.acceptedMsg : styles.pendingMsg}>
              {isAccepted ? 'Jullie zijn nu buddies 🎉' : 'Wil jouw buddy worden'}
            </Text>
            {!isAccepted && <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>}
          </View>
        </TouchableOpacity>

        {!isAccepted && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleAccept(item.id)}
              disabled={isProcessing}
            >
              {isProcessing
                ? <ActivityIndicator size="small" color={Colors.text} />
                : <Ionicons name="checkmark" size={22} color={Colors.text} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.declineBtn]}
              onPress={() => handleDecline(item.id)}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn2}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Meldingen</Text>
      </View>

      {loading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={requests.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRequests(true)}
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
  backBtn2: { padding: Spacing.xs },
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
  },
  cardInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardText: { flex: 1 },
  cardName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', marginBottom: 2 },
  pendingMsg: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  acceptedMsg: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
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
});
