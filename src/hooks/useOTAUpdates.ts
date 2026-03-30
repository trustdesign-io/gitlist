import { useEffect } from 'react'
import { Alert, AppState } from 'react-native'
import type { AppStateStatus } from 'react-native'
import * as Updates from 'expo-updates'

/**
 * Checks for OTA updates when the app comes to the foreground.
 * - Non-blocking: runs in the background without delaying app startup.
 * - On update available: prompts the user to restart immediately.
 * - On error: silently falls back to the cached bundle.
 *
 * Only active in non-development builds (expo-updates is a no-op in dev mode).
 */
export function useOTAUpdates() {
  useEffect(() => {
    // expo-updates is disabled in dev mode — skip entirely
    if (__DEV__ || !Updates.isEnabled) return

    // Single "busy" flag — held for the entire check + alert lifecycle
    // to prevent concurrent fetches and stacked alert dialogs
    let busy = false

    function release() {
      busy = false
    }

    async function checkForUpdate() {
      if (busy) return
      busy = true
      try {
        const result = await Updates.checkForUpdateAsync()
        if (!result.isAvailable) {
          release()
          return
        }

        await Updates.fetchUpdateAsync()

        // busy remains true until a button is pressed
        Alert.alert(
          'Update available',
          'A new version is ready. Restart now to apply it?',
          [
            { text: 'Later', style: 'cancel', onPress: release },
            {
              text: 'Restart',
              onPress: () => {
                release()
                Updates.reloadAsync().catch(() => {
                  // Reload failed — user remains on current version
                })
              },
            },
          ]
        )
      } catch {
        // Silently fall back to the cached bundle on any network or update error
        release()
      }
    }

    // Check on mount (app cold start)
    checkForUpdate()

    // Re-check each time the app becomes active from background
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        checkForUpdate()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [])
}
