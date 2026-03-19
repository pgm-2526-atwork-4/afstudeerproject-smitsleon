import { useAuth } from '@/core/AuthContext';
import { authStyles } from '@/style/authStyles';
import { Colors } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface LoginFormProps {
  onRegisterPress: () => void;
}

export function LoginForm({ onRegisterPress }: LoginFormProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Vul alle velden in');
      return;
    }
    setLoading(true);
    setError('');
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={authStyles.inner}
    >
      <Image source={require('../../../assets/logo/logo-green.png')} style={authStyles.logo} />
      <Text style={authStyles.title}>Concert Buddy</Text>
      <Text style={authStyles.subtitle}>Log in op je account</Text>

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

      <TouchableOpacity
        style={authStyles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text} />
        ) : (
          <Text style={authStyles.buttonText}>Inloggen</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onRegisterPress}>
        <Text style={authStyles.link}>
          Nog geen account? <Text style={authStyles.linkBold}>Registreer</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
