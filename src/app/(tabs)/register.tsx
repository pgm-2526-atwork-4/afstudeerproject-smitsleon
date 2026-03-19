import { RegisterForm } from '@/components/functional/RegisterForm';
import { Colors } from '@/style/theme';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabRegisterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <RegisterForm onLoginPress={() => router.replace('/(tabs)/profile')} />
    </SafeAreaView>
  );
}
