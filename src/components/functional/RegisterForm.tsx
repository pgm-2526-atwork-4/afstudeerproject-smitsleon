import { useAuth } from '@/core/AuthContext';
import { authStyles } from '@/style/authStyles';
import { Colors } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface RegisterFormProps {
  onLoginPress: () => void;
}

export function RegisterForm({ onLoginPress }: RegisterFormProps) {
  const { signUp } = useAuth();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={authStyles.inner}
    >
      <Text style={authStyles.title}>Concert Buddy</Text>
      <Text style={authStyles.subtitle}>Maak een account aan</Text>

      {error ? <Text style={authStyles.error}>{error}</Text> : null}

      <TextInput
        style={authStyles.input}
        placeholder="E-mail"
        placeholderTextColor={Colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <View style={authStyles.passwordRow}>
        <TextInput
          style={authStyles.passwordInput}
          placeholder="Wachtwoord"
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={authStyles.eyeButton}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={authStyles.passwordRow}>
        <TextInput
          style={authStyles.passwordInput}
          placeholder="Bevestig wachtwoord"
          placeholderTextColor={Colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={authStyles.eyeButton}>
          <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={authStyles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text} />
        ) : (
          <Text style={authStyles.buttonText}>Registreer</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onLoginPress}>
        <Text style={authStyles.link}>
          Heb je al een account? <Text style={authStyles.linkBold}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
