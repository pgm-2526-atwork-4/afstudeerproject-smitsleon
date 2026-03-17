import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserAvatar } from './UserAvatar';

interface Props {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  favouriteArtists: string[];
  onPress: () => void;
}

export function PersonCard({ firstName, lastName, avatarUrl, age, city, bio, favouriteArtists, onPress }: Props) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.row}>
        <UserAvatar uri={avatarUrl} initials={initials} size={56} />
        <View style={styles.info}>
          <Text style={styles.name}>
            {firstName} {lastName}{age != null ? `, ${age}` : ''}
          </Text>
          {city ? <Text style={styles.city}>{city}</Text> : null}
          {bio ? <Text style={styles.bio} numberOfLines={1}>{bio}</Text> : null}
        </View>
      </View>

      {favouriteArtists.length > 0 && (
        <View style={styles.chips}>
          {favouriteArtists.slice(0, 4).map((name) => (
            <View key={name} style={styles.chip}>
              <Text style={styles.chipText}>{name}</Text>
            </View>
          ))}
          {favouriteArtists.length > 4 && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>+{favouriteArtists.length - 4}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  city: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  bio: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
});
