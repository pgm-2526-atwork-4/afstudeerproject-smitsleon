import { useAuth } from '@/core/AuthContext';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
      setError('Vul alle velden in');
      return;
    }
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }
    if (password.length < 6) {
      setError('Wachtwoord moet minstens 6 tekens zijn');
      return;
    }
    setLoading(true);
    setError('');
    const result = await signUp(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <Text style={styles.title}>Concert Buddy</Text>
        <Text style={styles.subtitle}>Maak een account aan</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Wachtwoord"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Bevestig wachtwoord"
            placeholderTextColor={Colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
            <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <Text style={styles.buttonText}>Registreer</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>
            Heb je al een account? <Text style={styles.linkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    color: Colors.primary,
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
  },
  eyeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  error: {
    color: Colors.error,
    textAlign: 'center',
    fontSize: FontSizes.sm,
  },
  link: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontSize: FontSizes.sm,
  },
  linkBold: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});
