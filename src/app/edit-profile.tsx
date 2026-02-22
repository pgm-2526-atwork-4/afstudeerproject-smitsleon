import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { VIBE_TAGS, calculateAge } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [birthDate, setBirthDate] = useState<Date | null>(
    profile?.birth_date ? new Date(profile.birth_date) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [city, setCity] = useState<string | null>(profile?.city ?? null);
  const [latitude, setLatitude] = useState<number | null>(profile?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(profile?.longitude ?? null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [useLocation, setUseLocation] = useState(!!profile?.latitude);
  const [shareLocation, setShareLocation] = useState(profile?.share_location ?? true);
  
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(profile?.vibe_tags ?? []);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarUri || !user) return profile?.avatar_url ?? null;

    const ext = avatarUri.split('.').pop() ?? 'jpg';
    const fileName = `${user.id}/avatar.${ext}`;
    const response = await fetch(avatarUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

    if (error) {
      console.error('Upload error:', error);
      return profile?.avatar_url ?? null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  }

  // Get location
  async function getLocation() {
    setGettingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Toegang geweigerd', 'Zonder toestemming kunnen we je locatie niet bepalen.');
      setGettingLocation(false);
      setUseLocation(false);
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode[0] && geocode[0].city) {
        setCity(geocode[0].city);
      } else {
        setCity('Onbekend');
      }
    } catch (e) {
      Alert.alert('Fout', 'Kon de locatie niet bepalen. Controleer of GPS aan staat.');
      setUseLocation(false);
    }
    setGettingLocation(false);
  }

  async function handleToggleLocation(val: boolean) {
    if (val) {
      setUseLocation(true);
      await getLocation();
    } else {
      setUseLocation(false);
      setShareLocation(false);
      setCity(null);
      setLatitude(null);
      setLongitude(null);
    }
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Fout', 'Voornaam en achternaam zijn verplicht');
      return;
    }
    if (!user) return;
    setSaving(true);

    const avatarUrl = await uploadAvatar();
    const birthDateStr = birthDate ? birthDate.toISOString().split('T')[0] : null;

    const { error } = await supabase.from('users').update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      avatar_url: avatarUrl,
      birth_date: birthDateStr,
      age: birthDate ? calculateAge(birthDateStr!) : null,
      city: city || null,
      latitude: latitude,
      longitude: longitude,
      share_location: shareLocation,
      bio: bio.trim() || null,
      vibe_tags: selectedTags,
    }).eq('id', user.id);

    setSaving(false);
    if (error) {
      Alert.alert('Fout', error.message);
    } else {
      await refreshProfile();
      router.back();
    }
  }

  const displayAvatar = avatarUri ?? profile?.avatar_url;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profiel bewerken</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="camera" size={32} color={Colors.textMuted} />
              </View>
            )}
            <Text style={styles.changePhotoText}>Foto wijzigen</Text>
          </TouchableOpacity>

          {/* Fields */}
          <Text style={styles.label}>Voornaam *</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

          <Text style={styles.label}>Achternaam *</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

          {/* Birth date */}
          <Text style={styles.label}>Geboortedatum</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: birthDate ? Colors.text : Colors.textMuted, fontSize: FontSizes.md }}>
              {birthDate
                ? `${birthDate.toLocaleDateString('nl-BE')} (${calculateAge(birthDate.toISOString())} jaar)`
                : 'Kies geboortedatum'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={birthDate ?? new Date(2000, 0, 1)}
              mode="date"
              maximumDate={new Date()}
              minimumDate={new Date(1930, 0, 1)}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setBirthDate(date);
              }}
              themeVariant="dark"
            />
          )}

          {/* GPS Location Toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Locatie bepalen</Text>
              <Text style={styles.switchHelp}>Voor concerten in de buurt</Text>
            </View>
            <Switch 
              value={useLocation} 
              onValueChange={handleToggleLocation} 
              trackColor={{ true: Colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          {useLocation && (
            <View style={styles.locationContainer}>
              {gettingLocation ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="location" size={20} color={Colors.primary} />
                  <Text style={styles.locationText}>{city || 'Locatie ophalen...'}</Text>
                </>
              )}
            </View>
          )}

          {/* Share Location Toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Toon op profiel</Text>
              <Text style={styles.switchHelp}>Anderen zien je stad</Text>
            </View>
            <Switch 
              value={shareLocation} 
              onValueChange={setShareLocation} 
              trackColor={{ true: Colors.primary }}
              thumbColor="#ffffff"
              disabled={!useLocation}
            />
          </View>

          {/* Bio */}
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            placeholderTextColor={Colors.textMuted}
          />

          {/* Vibe tags */}
          <Text style={styles.label}>Vibes (max 3)</Text>
          <View style={styles.tagsGrid}>
            {VIBE_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, isSelected && styles.tagSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <Text style={styles.saveButtonText}>Opslaan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  avatarPicker: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    marginTop: Spacing.sm,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.text,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  switchHelp: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  locationText: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  tagTextSelected: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
