import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';

export type NotificationType = 'review' | 'favorite' | 'rating' | 'purchase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }
  return true;
}

export async function getDeviceToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

export async function registerDeviceToken(token: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('register_device_token', { p_token: token });
    if (error) throw error;
  } catch (error) {
    console.error('Failed to register device token:', error);
  }
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('unregister_device_token', { p_token: token });
    if (error) throw error;
  } catch (error) {
    console.error('Failed to unregister device token:', error);
  }
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

export function setupNotificationListeners() {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response: Notifications.NotificationResponse) => {
      console.log('Notification tapped:', response.notification.request.content.data);
    }
  );

  return () => subscription.remove();
}
