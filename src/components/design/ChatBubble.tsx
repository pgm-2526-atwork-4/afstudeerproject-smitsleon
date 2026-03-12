import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const LOCATION_REGEX = /^📍\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
const LIVE_LOCATION_REGEX = /^📍LIVE:(.+)$/;
const IMAGE_REGEX = /^📷\s+(https?:\/\/.+)$/;

function openInMaps(lat: number, lng: number) {
  const url = Platform.select({
    ios: `maps:0,0?q=${lat},${lng}`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  });
  Linking.openURL(url!);
}

function formatRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Verlopen';
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `Nog ${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rm = mins % 60;
  return rm > 0 ? `Nog ${hrs}u ${rm}min` : `Nog ${hrs}u`;
}

export interface LiveLocationData {
  latitude: number;
  longitude: number;
  expires_at: string;
  updated_at: string;
}

interface Props {
  content: string;
  isOwn: boolean;
  isDeleted: boolean;
  onLongPress?: () => void;
  liveLocation?: LiveLocationData | null;
}

export function ChatBubble({ content, isOwn, isDeleted, onLongPress, liveLocation }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  if (isDeleted) {
    return (
      <View style={[styles.bubble, styles.deleted]}>
        <Text style={styles.deletedText}>Dit bericht is verwijderd</Text>
      </View>
    );
  }

  // --- Live location message ---
  const liveMatch = content.match(LIVE_LOCATION_REGEX);
  if (liveMatch) {
    const isActive = liveLocation ? new Date(liveLocation.expires_at).getTime() > Date.now() : false;
    const lat = liveLocation?.latitude;
    const lng = liveLocation?.longitude;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={lat != null && lng != null ? () => openInMaps(lat, lng) : undefined}
        onLongPress={onLongPress}
        delayLongPress={500}
        style={[styles.locationBubble, isOwn ? styles.own : styles.other]}
      >
        <Ionicons name="radio" size={20} color={isActive ? Colors.text : Colors.textMuted} />
        <View style={styles.locationInfo}>
          <View style={styles.liveRow}>
            <Text style={[styles.locationTitle, !isActive && { color: Colors.textMuted }]}>
              Live locatie
            </Text>
            {isActive && <View style={styles.liveDot} />}
          </View>
          {liveLocation ? (
            <Text style={styles.locationCoords}>
              {isActive ? formatRemaining(liveLocation.expires_at) : 'Verlopen'}
            </Text>
          ) : (
            <Text style={styles.locationCoords}>Laden…</Text>
          )}
        </View>
        {lat != null && <Ionicons name="open-outline" size={14} color={Colors.textMuted} />}
      </TouchableOpacity>
    );
  }

  // --- One-time location message ---
  const locMatch = content.match(LOCATION_REGEX);
  if (locMatch) {
    const [, latStr, lngStr] = locMatch;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openInMaps(parseFloat(latStr), parseFloat(lngStr))}
        onLongPress={onLongPress}
        delayLongPress={500}
        style={[styles.locationBubble, isOwn ? styles.own : styles.other]}
      >
        <Ionicons name="location" size={20} color={Colors.primary} />
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>Mijn locatie</Text>
          <Text style={styles.locationCoords}>{latStr}, {lngStr}</Text>
        </View>
        <Ionicons name="open-outline" size={14} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  }

  // --- Image message ---
  const imgMatch = content.match(IMAGE_REGEX);
  if (imgMatch) {
    const url = imgMatch[1];
    return (
      <>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setFullscreen(true)}
          onLongPress={onLongPress}
          delayLongPress={500}
          style={[styles.imageBubble, isOwn ? styles.own : styles.other]}
        >
          <Image source={{ uri: url }} style={styles.chatImage} resizeMode="cover" />
        </TouchableOpacity>

        <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
          <Pressable style={styles.fullscreenOverlay} onPress={() => setFullscreen(false)}>
            <Image source={{ uri: url }} style={styles.fullscreenImage} resizeMode="contain" />
          </Pressable>
        </Modal>
      </>
    );
  }

  // --- Regular text message ---
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={onLongPress}
      delayLongPress={500}
      style={[styles.bubble, isOwn ? styles.own : styles.other]}
    >
      <Text style={styles.text}>{content}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  own: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  other: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  deleted: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    color: Colors.text,
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  deletedText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
  },
  locationBubble: {
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  locationCoords: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  imageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  chatImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
});
