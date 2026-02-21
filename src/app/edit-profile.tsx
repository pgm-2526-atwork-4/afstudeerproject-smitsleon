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

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [age, setAge] = useState(profile?.age?.toString() ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
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

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Fout', 'Voornaam en achternaam zijn verplicht');
      return;
    }
    if (!user) return;
    setSaving(true);

    const avatarUrl = await uploadAvatar();

    const { error } = await supabase.from('users').update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      avatar_url: avatarUrl,
      age: age ? parseInt(age, 10) : null,
      city: city.trim() || null,
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
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Achternaam *</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Leeftijd</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Woonplaats</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholderTextColor={Colors.textMuted}
          />

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
