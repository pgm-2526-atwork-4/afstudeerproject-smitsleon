import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Colors } from '../../style/theme';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request push notification permissions, get an Expo push token, and save it to the user's profile in supabase.

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

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Concert Buddy',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.primary,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    await supabase.from('users').update({ push_token: token }).eq('id', userId);

    return token;
  } catch {
    return null;
  }
}


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

  // 2. Send push notifications
  await sendPushOnly(
    notifications.map((n) => ({
      user_id: n.user_id,
      title: n.title,
      body: n.body,
      data: { type: n.type, ...n.data },
    })),
  );
}


export async function sendPushOnly(
  targets: {
    user_id: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }[],
): Promise<void> {
  if (targets.length === 0) return;

  const userIds = [...new Set(targets.map((t) => t.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, push_token')
    .in('id', userIds)
    .not('push_token', 'is', null);

  if (!users || users.length === 0) return;

  const tokenMap = new Map<string, string>();
  for (const u of users) {
    if (u.push_token) tokenMap.set(u.id, u.push_token as string);
  }

  const messages = targets
    .filter((t) => tokenMap.has(t.user_id))
    .map((t) => ({
      to: tokenMap.get(t.user_id)!,
      sound: 'default' as const,
      title: t.title,
      body: t.body,
      data: t.data ?? {},
    }));

  if (messages.length === 0) return;

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
  }
}
