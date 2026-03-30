import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Constants from 'expo-constants'

// Configure how notifications are presented when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if permissions are denied or unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications don't work on simulators
  const projectId = Constants.default.expoConfig?.extra?.eas?.projectId
  if (!projectId) {
    console.warn('Missing EAS project ID for push notifications')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    })
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId })
  return token.data
}

/**
 * Listen for notifications received while the app is foregrounded.
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback)
}

/**
 * Listen for when the user taps a notification.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback)
}
