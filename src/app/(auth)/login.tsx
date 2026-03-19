import { LoginForm } from '@/components/functional/LoginForm';
import { authStyles } from '@/style/authStyles';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={authStyles.container}>
      <LoginForm onRegisterPress={() => router.push('/(auth)/register')} />
    </SafeAreaView>
  );
}
