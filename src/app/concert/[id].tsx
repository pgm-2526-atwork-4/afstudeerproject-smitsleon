import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ConcertDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    date: string;
    time: string;
    venue: string;
    city: string;
    imageUrl: string;
    url: string;
  }>();

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header image */}
        <View style={styles.imageWrapper}>
          {params.imageUrl ? (
            <Image source={{ uri: params.imageUrl }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, { backgroundColor: Colors.surface }]} />
          )}
          <View style={styles.imageOverlay} />
          <Text style={styles.artistName}>{params.name}</Text>

          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Event info */}
        <View style={styles.infoSection}>
          <Text style={styles.tourName}>{params.name}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>{params.date}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>{params.time || 'Tijd nog onbekend'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>{params.venue}, {params.city}</Text>
          </View>
        </View>

        {/* Tickets button */}
        {params.url ? (
          <TouchableOpacity
            style={styles.ticketButton}
            onPress={() => Linking.openURL(params.url)}
          >
            <Text style={styles.ticketButtonText}>Tickets kopen</Text>
            <Ionicons name="open-outline" size={16} color={Colors.text} />
          </TouchableOpacity>
        ) : null}

        {/* Groups section */}
        <View style={styles.groupsSection}>
          <View style={styles.groupsHeader}>
            <Text style={styles.groupsTitle}>Groepen</Text>
            <TouchableOpacity style={styles.newGroupButton}>
              <Ionicons name="add" size={18} color={Colors.text} />
              <Text style={styles.newGroupButtonText}>Nieuwe groep</Text>
            </TouchableOpacity>
          </View>

          {/* Placeholder - groups worden later ingeladen via Supabase */}
          <Text style={styles.emptyGroups}>
            Nog geen groepen voor dit event. Maak er een aan!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  imageWrapper: {
    position: 'relative',
    height: 300,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  artistName: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    color: Colors.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  infoSection: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  tourName: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.sm,
  },
  ticketButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  groupsSection: {
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  groupsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  groupsTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  newGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  newGroupButtonText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  emptyGroups: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
