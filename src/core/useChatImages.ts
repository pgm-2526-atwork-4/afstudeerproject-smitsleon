import { supabase } from '@/core/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

interface Opts {
  userId: string | undefined;
  sendMessage: (content: string) => Promise<void>;
}

export function useChatImages({ userId, sendMessage }: Opts) {
  const [imageLoading, setImageLoading] = useState(false);

  async function pickAndSend() {
    if (!userId || imageLoading) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuleren', 'Neem een foto', 'Kies uit bibliotheek'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) launch('camera');
          else if (idx === 2) launch('library');
        },
      );
    } else {
      Alert.alert('Foto toevoegen', '', [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Neem een foto', onPress: () => launch('camera') },
        { text: 'Kies uit bibliotheek', onPress: () => launch('library') },
      ]);
    }
  }

  async function launch(source: 'camera' | 'library') {
    setImageLoading(true);
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Geen toegang', 'Geef toegang tot je camera om een foto te nemen.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Geen toegang', 'Geef toegang tot je bibliotheek om een foto te kiezen.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const mimeType = asset.mimeType ?? `image/${ext}`;

      const formData = new FormData();
      formData.append('', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, formData, { contentType: mimeType });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Fout', 'Afbeelding uploaden mislukt.');
        return;
      }

      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
      await sendMessage(`📷 ${urlData.publicUrl}`);
    } catch (e) {
      console.error('Image error:', e);
      Alert.alert('Fout', 'Kon de afbeelding niet versturen.');
    } finally {
      setImageLoading(false);
    }
  }

  return { imageLoading, pickAndSend };
}
