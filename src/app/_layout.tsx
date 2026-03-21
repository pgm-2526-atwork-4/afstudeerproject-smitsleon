import { AuthProvider, useAuth } from '@/core/AuthContext';
import '@/core/pushNotifications'; // initialise notification handler early
import { supabase } from '@/core/supabase';
import { Colors } from '@/style/theme';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Navigate to the correct screen when the user taps a push notification
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastNotificationResponse || !session || loading) return;

    const data = lastNotificationResponse.notification.request.content.data as
      | Record<string, any>
      | undefined;
    const type = data?.type as string | undefined;

    (async () => {
      try {
        // Chat message → open group chat
        if (type === 'chat_message' && data?.group_id) {
          const { data: g } = await supabase
            .from('groups')
            .select('id, title, description, max_members, created_by, event_id, events(name, image_url, date, location_name)')
            .eq('id', data.group_id)
            .single();
          if (g) {
            const ev = Array.isArray(g.events) ? g.events[0] : g.events;
            router.push({
              pathname: '/group/chat',
              params: {
                id: g.id,
                title: g.title,
                description: g.description ?? '',
                max_members: String(g.max_members ?? 6),
                created_by: g.created_by ?? '',
                event_id: g.event_id ?? '',
                event_name: ev?.name ?? '',
                event_image_url: ev?.image_url ?? '',
                event_date: ev?.date ?? '',
                event_location: ev?.location_name ?? '',
              },
            });
            return;
          }
        }

        // Private message → open private chat
        if (type === 'private_message' && data?.sender_id) {
          const { data: u } = await supabase
            .from('users')
            .select('id, first_name, last_name, avatar_url')
            .eq('id', data.sender_id)
            .single();
          if (u) {
            router.push({
              pathname: '/private-chat',
              params: {
                userId: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                avatarUrl: u.avatar_url ?? '',
              },
            });
            return;
          }
        }

        // Everything else → notifications page
        router.push('/notifications');
      } catch {
        router.push('/notifications');
      }
    })();
  }, [lastNotificationResponse, session, loading, router]);

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const inOnboarding = segments[0] === 'onboarding';

  // Redirect away from onboarding when not logged in
  if (!session && inOnboarding) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Allow guests to browse (tabs) — only redirect when needed
  if (session && (!profile || !profile.first_name) && !inOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  if (session && profile?.first_name && inOnboarding) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
      <Stack.Screen name="favourite-venues" />
      <Stack.Screen name="my-concerts" />
      <Stack.Screen name="venue/[id]" />
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
