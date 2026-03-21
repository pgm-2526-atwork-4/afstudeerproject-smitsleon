import { EmptyState } from '@/components/design/EmptyState';
import { LoadingScreen } from '@/components/design/LoadingScreen';
import { UserAvatar } from '@/components/design/UserAvatar';
import { useAuth } from '@/core/context/AuthContext';
import { supabase } from '@/core/lib/supabase';
import { getBuddyIds } from '@/core/lib/utils';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Buddy {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export default function BuddiesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState<Buddy | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchBuddies = useCallback(async (isRefresh = false) => {
    if (!targetUserId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const buddyIds = await getBuddyIds(targetUserId);

    if (buddyIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', buddyIds);

      setBuddies(
        (usersData ?? []).map((u: any) => ({
          user_id: u.id,
          first_name: u.first_name ?? '',
          last_name: u.last_name ?? '',
          avatar_url: u.avatar_url ?? null,
        }))
      );
    } else {
      setBuddies([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [targetUserId]);

  useFocusEffect(useCallback(() => { fetchBuddies(); }, [fetchBuddies]));

  async function handleRemoveBuddy() {
    if (!user || !selectedBuddy) return;
    Alert.alert(
      'Buddy verwijderen',
      `Weet je zeker dat je ${selectedBuddy.first_name} ${selectedBuddy.last_name} als buddy wilt verwijderen?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            const uid1 = user.id < selectedBuddy.user_id ? user.id : selectedBuddy.user_id;
            const uid2 = user.id < selectedBuddy.user_id ? selectedBuddy.user_id : user.id;
            const { error } = await supabase.from('buddies').delete().eq('user_id_1', uid1).eq('user_id_2', uid2);
            if (error) {
              Alert.alert('Fout', 'Kon buddy niet verwijderen.');
            } else {
              await Promise.all([
                supabase.from('buddy_requests').delete().eq('from_user_id', user.id).eq('to_user_id', selectedBuddy.user_id),
                supabase.from('buddy_requests').delete().eq('from_user_id', selectedBuddy.user_id).eq('to_user_id', user.id),
              ]);
              setBuddies((prev) => prev.filter((b) => b.user_id !== selectedBuddy.user_id));
            }
            setRemoving(false);
            setSelectedBuddy(null);
          },
        },
      ]
    );
  }

  function renderBuddy({ item }: { item: Buddy }) {
    const initials = `${item.first_name[0] ?? ''}${item.last_name[0] ?? ''}`.toUpperCase();
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardInfo}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user_id } })}
        >
          <UserAvatar uri={item.avatar_url} initials={initials} size={48} />
          <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
        </TouchableOpacity>
        {isOwnProfile && (
          <TouchableOpacity style={styles.menuBtn} onPress={() => setSelectedBuddy(item)}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isOwnProfile ? 'Mijn Buddies' : 'Buddies'}</Text>
      </View>

      {loading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={buddies}
          keyExtractor={(item) => item.user_id}
          renderItem={renderBuddy}
          contentContainerStyle={buddies.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBuddies(true)} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Nog geen buddies"
              subtitle="Stuur buddy verzoeken naar andere gebruikers om buddies te worden."
            />
          }
        />
      )}

      <Modal visible={selectedBuddy !== null} transparent animationType="fade" onRequestClose={() => setSelectedBuddy(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedBuddy(null)}>
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuOption} onPress={handleRemoveBuddy} disabled={removing}>
              {removing
                ? <ActivityIndicator size="small" color={Colors.error} />
                : <><Ionicons name="person-remove-outline" size={20} color={Colors.error} /><Text style={styles.dangerText}>Verwijder buddy</Text></>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  cardInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  name: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  menuBtn: { padding: Spacing.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menu: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    minWidth: 200,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.sm },
  dangerText: { color: Colors.error, fontSize: FontSizes.md, fontWeight: '600' },
});
