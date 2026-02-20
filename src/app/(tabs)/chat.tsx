import { Colors, FontSizes, Spacing } from '@/style/theme';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1, padding: Spacing.xl }}>
        <Text style={{ color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold' }}>
          Chats
        </Text>
      </View>
    </SafeAreaView>
  );
}
