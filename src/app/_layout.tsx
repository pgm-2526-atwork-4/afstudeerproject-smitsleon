import { AuthProvider, useAuth } from '@/core/AuthContext';
import { Colors } from '@/style/theme';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[0] === 'onboarding';

  // Redirect away from onboarding when not logged in
  if (!session && inOnboarding) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Allow guests to browse (tabs) — only redirect when needed
  if (session && (!profile || !profile.first_name) && !inOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  if (session && profile?.first_name && (inAuthGroup || inOnboarding)) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="concert/[id]" />
      <Stack.Screen name="group/[id]" />
      <Stack.Screen name="group/chat" />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="artist/[id]" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="buddies" />
      <Stack.Screen name="private-chat" />
      <Stack.Screen name="favourite-artists" />
      <Stack.Screen name="section-events" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DarkTheme}>
        <RootNavigator />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
