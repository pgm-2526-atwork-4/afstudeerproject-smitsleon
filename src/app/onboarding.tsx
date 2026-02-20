import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { VIBE_TAGS } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 - required
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Step 2 - optional
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  // Step 3 - vibe tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Pick image from phone
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

  // Upload avatar to Supabase Storage
  async function uploadAvatar(): Promise<string | null> {
    if (!avatarUri || !user) return null;

    const ext = avatarUri.split('.').pop() ?? 'jpg';
    const fileName = `${user.id}/avatar.${ext}`;

    const response = await fetch(avatarUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) {
      console.error('Avatar upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  }

  // Toggle vibe tag (max 3)
  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  }

  // Validate step 1
  function canGoNext(): boolean {
    if (step === 1) return firstName.trim() !== '' && lastName.trim() !== '' && avatarUri !== null;
    return true;
  }

  // Save profile to Supabase
  async function handleFinish() {
    if (!user) return;
    setSaving(true);

    try {
      const avatarUrl = await uploadAvatar();

      const { error } = await supabase.from('users').upsert({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar_url: avatarUrl,
        age: age ? parseInt(age, 10) : null,
        city: city.trim() || null,
        bio: bio.trim() || null,
        vibe_tags: selectedTags,
      });

      if (error) {
        Alert.alert('Fout', error.message);
        setSaving(false);
        return;
      }

      await refreshProfile();
      router.replace('/(tabs)/home');
    } catch (e) {
      Alert.alert('Fout', 'Er ging iets mis. Probeer het opnieuw.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Progress indicator */}
          <View style={styles.progress}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[styles.dot, s === step && styles.dotActive, s < step && styles.dotDone]}
              />
            ))}
          </View>

          {/* Step 1: Required info */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Stel je voor</Text>
              <Text style={styles.stepSubtitle}>Deze info is verplicht</Text>

              {/* Avatar picker */}
              <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={32} color={Colors.textMuted} />
                    <Text style={styles.avatarText}>Foto kiezen</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Voornaam"
                placeholderTextColor={Colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder="Achternaam"
                placeholderTextColor={Colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
              />
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.email ?? ''}
                editable={false}
              />
            </View>
          )}

          {/* Step 2: Optional info */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Over jou</Text>
              <Text style={styles.stepSubtitle}>Dit is optioneel</Text>

              <TextInput
                style={styles.input}
                placeholder="Leeftijd"
                placeholderTextColor={Colors.textMuted}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Woonplaats"
                placeholderTextColor={Colors.textMuted}
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Bio — vertel iets over jezelf"
                placeholderTextColor={Colors.textMuted}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* Step 3: Vibe tags */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Jouw concert vibe</Text>
              <Text style={styles.stepSubtitle}>Kies max. 3 tags</Text>

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
            </View>
          )}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.nav}>
          {step > 1 ? (
            <TouchableOpacity style={styles.navBack} onPress={() => setStep(step - 1)}>
              <Text style={styles.navBackText}>Terug</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {step < 3 ? (
            <TouchableOpacity
              style={[styles.navNext, !canGoNext() && styles.navDisabled]}
              onPress={() => canGoNext() && setStep(step + 1)}
              disabled={!canGoNext()}
            >
              <Text style={styles.navNextText}>Volgende</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.navNext}
              onPress={handleFinish}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.navNextText}>Voltooien</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surface,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  dotDone: {
    backgroundColor: Colors.primary,
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  stepSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
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
  inputDisabled: {
    opacity: 0.5,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
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
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  navBack: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  navBackText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  navNext: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  navDisabled: {
    opacity: 0.4,
  },
  navNextText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});
