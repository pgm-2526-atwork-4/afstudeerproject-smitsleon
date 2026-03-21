import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request push notification permissions, get an Expo push token,
 * and save it to the user's profile in Supabase.
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  try {
    // Check / request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    // Android needs a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Concert Buddy',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1DB954',
      });
    }

    // Get the Expo Push Token using the EAS project ID
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Persist the token in the user's profile
    await supabase.from('users').update({ push_token: token }).eq('id', userId);

    return token;
  } catch {
    // Push registration is best-effort (e.g. fails on emulators)
    return null;
  }
}

/**
 * Create in-app notifications in the database AND send push notifications
 * to each target user's device. Replaces direct `notifications` table inserts.
 */
export async function notifyUsers(
  notifications: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }[],
): Promise<void> {
  if (notifications.length === 0) return;

  // 1. Insert in-app notifications
  await supabase.from('notifications').insert(notifications);

  // 2. Fetch push tokens for all target users
  const userIds = [...new Set(notifications.map((n) => n.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, push_token')
    .in('id', userIds)
    .not('push_token', 'is', null);

  if (!users || users.length === 0) return;

  // 3. Build per-user push messages
  const tokenMap = new Map<string, string>();
  for (const u of users) {
    if (u.push_token) tokenMap.set(u.id, u.push_token as string);
  }

  const messages = notifications
    .filter((n) => tokenMap.has(n.user_id))
    .map((n) => ({
      to: tokenMap.get(n.user_id)!,
      sound: 'default' as const,
      title: n.title,
      body: n.body,
      data: { type: n.type, ...n.data },
    }));

  if (messages.length === 0) return;

  // 4. Send via Expo Push API (best-effort — never block the UI flow)
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // Silent fail — push delivery should not break the in-app flow
  }
}
