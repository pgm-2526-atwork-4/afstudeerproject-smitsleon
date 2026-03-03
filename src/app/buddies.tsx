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
    Image,
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
  created_at: string;
}

export default function BuddiesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState<Buddy | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchBuddies = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    // Fetch buddies where current user is either user_id_1 or user_id_2
    const { data, error } = await supabase
      .from('buddies')
      .select(`
        user_id_1,
        user_id_2,
        created_at
      `)
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching buddies:', error);
    } else {
      // Get the other user's ID for each buddy relationship
      const buddyIds = (data ?? []).map((row: any) => 
        row.user_id_1 === user.id ? row.user_id_2 : row.user_id_1
      );

      if (buddyIds.length > 0) {
        // Fetch user details for all buddies
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url')
          .in('id', buddyIds);

        const parsed: Buddy[] = (usersData ?? []).map((u: any) => ({
          user_id: u.id,
          first_name: u.first_name ?? '',
          last_name: u.last_name ?? '',
          avatar_url: u.avatar_url ?? null,
          created_at: data?.find((b: any) => 
            b.user_id_1 === u.id || b.user_id_2 === u.id
          )?.created_at ?? '',
        }));

        setBuddies(parsed);
      } else {
        setBuddies([]);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchBuddies();
    }, [fetchBuddies])
  );

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
            
            // Delete the buddy relationship (need to check both orderings)
            const userId1 = user.id < selectedBuddy.user_id ? user.id : selectedBuddy.user_id;
            const userId2 = user.id < selectedBuddy.user_id ? selectedBuddy.user_id : user.id;
            
            const { error } = await supabase
              .from('buddies')
              .delete()
              .eq('user_id_1', userId1)
              .eq('user_id_2', userId2);

            if (error) {
              console.error('Error removing buddy:', error);
              Alert.alert('Fout', 'Kon buddy niet verwijderen. Probeer opnieuw.');
            } else {
              // Also delete any buddy_requests between these users (in both directions)
              // Direction 1: current user -> selected buddy
              await supabase
                .from('buddy_requests')
                .delete()
                .eq('from_user_id', user.id)
                .eq('to_user_id', selectedBuddy.user_id);
              
              // Direction 2: selected buddy -> current user
              await supabase
                .from('buddy_requests')
                .delete()
                .eq('from_user_id', selectedBuddy.user_id)
                .eq('to_user_id', user.id);
              
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
    const initials = `${item.first_name.charAt(0)}${item.last_name.charAt(0)}`.toUpperCase();

    return (
      <View style={styles.buddyCard}>
        <TouchableOpacity
          style={styles.buddyInfo}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user_id } })}
        >
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.buddyText}>
            <Text style={styles.buddyName}>
              {item.first_name} {item.last_name}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSelectedBuddy(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mijn Buddies</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={buddies}
          keyExtractor={(item) => item.user_id}
          renderItem={renderBuddy}
          contentContainerStyle={buddies.length === 0 ? { flex: 1 } : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBuddies(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nog geen buddies</Text>
              <Text style={styles.emptySubtitle}>
                Stuur buddy verzoeken naar andere gebruikers om buddies te worden.
              </Text>
            </View>
          }
        />
      )}

      {/* Menu Modal */}
      <Modal
        visible={selectedBuddy !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBuddy(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBuddy(null)}
        >
          <View style={styles.menuModal}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleRemoveBuddy}
              disabled={removing}
            >
              {removing ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Ionicons name="person-remove-outline" size={20} color={Colors.error} />
                  <Text style={styles.menuOptionTextDanger}>Verwijder buddy</Text>
                </>
              )}
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
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold', flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: { padding: Spacing.lg, gap: Spacing.md },
  buddyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  buddyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLight,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  buddyText: { flex: 1 },
  buddyName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModal: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    minWidth: 200,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  menuOptionTextDanger: {
    color: Colors.error,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
