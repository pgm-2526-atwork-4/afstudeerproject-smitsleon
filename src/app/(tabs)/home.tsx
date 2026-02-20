import { Event } from '@/core/types';
import { useConcerts } from '@/core/useConcerts';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { events, loading, error, searchConcerts } = useConcerts();
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = useCallback(() => {
    searchConcerts(query.trim() || undefined);
  }, [query]);

  const handleClear = useCallback(() => {
    setQuery('');
    searchConcerts();
  }, []);

  function renderEvent({ item }: { item: Event }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/concert/[id]',
            params: {
              id: item.id,
              name: item.name,
              date: item.date,
              time: item.time,
              venue: item.venue,
              city: item.city,
              imageUrl: item.imageUrl,
              url: item.url ?? '',
            },
          })
        }
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : null}
        <View style={styles.cardContent}>
          <Text style={styles.eventName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.eventDetails}>
            {item.venue}, {item.city}
          </Text>
          <Text style={styles.eventDetails}>
            {item.date} {item.time ? `• ${item.time}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Concert Buddy</Text>

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
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Zoek</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Evenementen laden...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => searchConcerts()}>
            <Text style={styles.retryText}>Opnieuw proberen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Geen evenementen gevonden.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.sm,
    paddingVertical: 10,
  },
  clearButton: {
    marginLeft: Spacing.xs,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: FontSizes.sm,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  cardContent: {
    padding: Spacing.md,
  },
  eventName: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  eventDetails: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: FontSizes.md,
  },
});
