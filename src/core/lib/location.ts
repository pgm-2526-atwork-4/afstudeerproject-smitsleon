import * as Location from 'expo-location';

export interface LocationResult {
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Get the user's current city + coordinates via GPS and reverse geocoding.
 * @param requestPermission  true = prompt user for permission (onboarding / edit-profile),
 *                           false = only proceed if already granted (silent auto-update).
 */
export async function resolveCurrentCity(
  requestPermission: boolean,
): Promise<LocationResult | null> {
  const { status } = requestPermission
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();

  if (status !== 'granted') return null;

  const loc = await Location.getCurrentPositionAsync({});
  const geocode = await Location.reverseGeocodeAsync({
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  });

  return {
    city: geocode[0]?.city ?? 'Onbekend',
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  };
}
