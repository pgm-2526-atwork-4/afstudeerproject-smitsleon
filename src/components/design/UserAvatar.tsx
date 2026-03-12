import { Colors } from '@/style/theme';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface Props {
  uri?: string | null;
  initials: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular user avatar. Shows photo if uri is provided, otherwise shows initials.
 */
export function UserAvatar({ uri, initials, size = 40, style }: Props) {
  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (uri) {
    return <Image source={{ uri }} style={[styles.base, circleStyle, style as StyleProp<ImageStyle>]} />;
  }

  return (
    <View style={[styles.base, styles.placeholder, circleStyle, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
});
