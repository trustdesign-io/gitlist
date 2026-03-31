import { usePathname } from 'expo-router'
import { useEffect } from 'react'
import { captureScreen } from '../lib/analytics'

/**
 * Automatically tracks screen views whenever the Expo Router path changes.
 * Mount once in RootLayoutNav.
 */
export function useScreenTracking(): void {
  const pathname = usePathname()
  useEffect(() => {
    captureScreen(pathname)
  }, [pathname])
}
