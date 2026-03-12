import { ConcertCard } from '@/components/design/ConcertCard';
import { ConcertSection } from '@/components/design/ConcertSection';
import { FilterModal } from '@/components/design/FilterModal';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Artist, Event, FilterState, Venue } from '@/core/types';
import { useConcerts } from '@/core/useConcerts';
import { useHomeSections } from '@/core/useHomeSections';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { events, groupCounts, loading: searchLoading, error, searchConcerts } = useConcerts();
  const sections = useHomeSections();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [venueResults, setVenueResults] = useState<Venue[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    groupsOnly: false,
    minGroupSize: '',
    maxGroupSize: '',
    startDate: null,
    endDate: null,
  });
  const router = useRouter();

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const [buddyRes, notifRes] = await Promise.all([
      supabase
        .from('buddy_requests')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false),
    ]);
    setUnreadCount((buddyRes.count ?? 0) + (notifRes.count ?? 0));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      sections.load();
    }, [fetchUnreadCount, sections.load])
  );

  const handleSearch = useCallback(() => {
    const q = query.trim();
    const hasActiveFilters = filters.groupsOnly || filters.startDate || filters.endDate;
    
    if (q || hasActiveFilters) {
      setIsSearchActive(true);
      searchConcerts(q, filters);
      
      if (q) {
        supabase
          .from('artists')
          .select('*')
          .ilike('name', `%${q}%`)
          .limit(10)
          .then(({ data }) =>
            setArtistResults(
              (data ?? []).map((a: any) => ({ id: a.id, name: a.name, imageUrl: a.image_url ?? '', genre: a.genre ?? '' }))
            )
          );
        supabase
          .from('venues')
          .select('*')
          .ilike('name', `%${q}%`)
          .limit(10)
          .then(({ data }) =>
            setVenueResults(
              (data ?? []).map((v: any) => ({
                id: v.id,
                name: v.name,
                city: v.city ?? '',
                address: v.address ?? '',
                imageUrl: v.image_url ?? '',
                latitude: v.latitude,
                longitude: v.longitude,
              }))
            )
          );
      } else {
        setArtistResults([]);
        setVenueResults([]);
      }
    } else {
      setIsSearchActive(false);
      sections.load();
    }
  }, [query, filters]);

  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setIsFilterVisible(false);
    
    const q = query.trim();
    const hasActiveFilters = newFilters.groupsOnly || newFilters.startDate || newFilters.endDate;
    
    if (q || hasActiveFilters) {
      setIsSearchActive(true);
      searchConcerts(q, newFilters);
      if (!q) {
        setArtistResults([]);
        setVenueResults([]);
      }
    } else {
      setIsSearchActive(false);
      sections.load();
    }
  };

  // Auto-search when query or filters change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [query, filters, handleSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setFilters({ groupsOnly: false, minGroupSize: '', maxGroupSize: '', startDate: null, endDate: null });
    setArtistResults([]);
    setVenueResults([]);
    setIsSearchActive(false);
  }, []);

  function navigateToEvent(event: Event) {
    router.push({ pathname: '/concert/[id]', params: { id: event.id } });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Concert Buddy</Text>
        {user ? (
        <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        ) : (
        <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/(auth)/login')}>
          <Ionicons name="log-in-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Zoek artiest, event, venue of stad..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterVisible(!isFilterVisible)}>
          <Ionicons name="options-outline" size={24} color={Colors.text} />
          {(filters.groupsOnly || filters.startDate || filters.endDate) && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>
      
      <FilterModal 
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        initialFilters={filters}
        onApply={applyFilters}
      />

      {isSearchActive ? (
        /* ========== SEARCH RESULTS MODE ========== */
        <>
          {/* Artist results */}
          {artistResults.length > 0 && (
            <View style={styles.artistSection}>
              <Text style={styles.artistSectionTitle}>Artiesten</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScroll}>
                {artistResults.map((artist) => (
                  <TouchableOpacity
                    key={artist.id}
                    style={styles.artistCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/artist/[id]',
                        params: { id: artist.id, name: artist.name, imageUrl: artist.imageUrl, genre: artist.genre },
                      })
                    }
                  >
                    {artist.imageUrl ? (
                      <Image source={{ uri: artist.imageUrl }} style={styles.artistAvatar} />
                    ) : (
                      <View style={[styles.artistAvatar, styles.artistAvatarPlaceholder]}>
                        <Ionicons name="musical-notes" size={20} color={Colors.textMuted} />
                      </View>
                    )}
                    <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
                    {artist.genre ? <Text style={styles.artistGenre} numberOfLines={1}>{artist.genre}</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Venue results */}
          {venueResults.length > 0 && (
            <View style={styles.artistSection}>
              <Text style={styles.artistSectionTitle}>Venues</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScroll}>
                {venueResults.map((venue) => (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.artistCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/venue/[id]',
                        params: { id: venue.id, name: venue.name, city: venue.city },
                      })
                    }
                  >
                    {venue.imageUrl ? (
                      <Image source={{ uri: venue.imageUrl }} style={styles.artistAvatar} />
                    ) : (
                      <View style={[styles.artistAvatar, styles.artistAvatarPlaceholder]}>
                        <Ionicons name="location" size={20} color={Colors.textMuted} />
                      </View>
                    )}
                    <Text style={styles.artistName} numberOfLines={2}>{venue.name}</Text>
                    {venue.city ? <Text style={styles.artistGenre} numberOfLines={1}>{venue.city}</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Search event results */}
          {searchLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Evenementen laden...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => searchConcerts(query, filters)}>
                <Text style={styles.retryText}>Opnieuw proberen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>Geen evenementen gevonden.</Text>}
              renderItem={({ item }) => (
                <View style={styles.cardWrapper}>
                  <ConcertCard
                    name={item.name}
                    date={item.date}
                    venue={item.venue}
                    imageUrl={item.imageUrl}
                    groupCount={groupCounts[item.id] ?? 0}
                    fill
                    onPress={() => navigateToEvent(item)}
                  />
                </View>
              )}
            />
          )}
        </>
      ) : (
        /* ========== SECTIONS MODE (default) ========== */
        sections.loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Laden...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.sectionsScroll}
            refreshControl={
              <RefreshControl
                refreshing={sections.loading}
                onRefresh={sections.load}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
          >
            <ConcertSection
              title="Binnenkort"
              events={sections.upcoming}
              groupCounts={sections.groupCounts}
              onEventPress={navigateToEvent}
              onSeeMore={() => router.push({ pathname: '/section-events', params: { section: 'upcoming' } })}
            />
            <ConcertSection
              title="Je buddies gaan ook"
              events={sections.buddies}
              groupCounts={sections.groupCounts}
              onEventPress={navigateToEvent}
              onSeeMore={() => router.push({ pathname: '/section-events', params: { section: 'buddies' } })}
            />
            <ConcertSection
              title="Favoriete artiesten"
              events={sections.favouriteArtists}
              groupCounts={sections.groupCounts}
              onEventPress={navigateToEvent}
              onSeeMore={() => router.push({ pathname: '/section-events', params: { section: 'favouriteArtists' } })}
            />
            <ConcertSection
              title="In de buurt"
              events={sections.nearby}
              groupCounts={sections.groupCounts}
              onEventPress={navigateToEvent}
              onSeeMore={() => router.push({ pathname: '/section-events', params: { section: 'nearby' } })}
            />

            {/* Fallback if all sections are empty */}
            {sections.upcoming.length === 0 &&
              sections.buddies.length === 0 &&
              sections.favouriteArtists.length === 0 &&
              sections.nearby.length === 0 && (
                <View style={styles.center}>
                  <Ionicons name="musical-notes-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>Geen concerten gevonden</Text>
                </View>
              )}
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold' },
  notificationButton: { position: 'relative', padding: Spacing.xs },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: Colors.text, fontSize: 10, fontWeight: 'bold' },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.sm, paddingVertical: 10 },
  clearButton: { marginLeft: Spacing.xs },
  filterButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 44,
    height: 44,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  sectionsScroll: { paddingTop: Spacing.sm, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md },
  errorText: { color: Colors.error, fontSize: FontSizes.md, textAlign: 'center', marginBottom: Spacing.md },
  retryText: { color: Colors.primary, fontWeight: 'bold', fontSize: 15 },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: FontSizes.md },

  // Search results styles
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  row: { justifyContent: 'space-between', marginBottom: Spacing.lg },
  cardWrapper: { width: '48%' },

  // Artist search results
  artistSection: { paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.sm },
  artistSectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  artistScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  artistCard: { alignItems: 'center', width: 90, gap: Spacing.xs },
  artistAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.surfaceLight },
  artistAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  artistName: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600', textAlign: 'center' },
  artistGenre: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
});
