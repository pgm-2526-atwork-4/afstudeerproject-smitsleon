import { Event } from '@/core/types';
import { useConcerts } from '@/core/useConcerts';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { events, loading, error, searchConcerts } = useConcerts();

  function renderEvent({ item }: { item: Event }) {
    return (
      <View style={styles.card}>
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Home</Text>

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
