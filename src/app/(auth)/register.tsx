import { RegisterForm } from '@/components/functional/RegisterForm';
import { authStyles } from '@/style/authStyles';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={authStyles.container}>
      <RegisterForm onLoginPress={() => router.back()} />
    </SafeAreaView>
  );
}
