import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider } from '../components/AuthProvider'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { EnvironmentBadge } from '../components/EnvironmentBadge'
import { useAuthStore } from '../stores/auth-store'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'
import { useOTAUpdates } from '../hooks/useOTAUpdates'
import { useEntitlementCheck } from '../hooks/useEntitlementCheck'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { initPurchases } from '../lib/purchases'
import { initSentry } from '../lib/sentry'

SplashScreen.preventAutoHideAsync()

// Initialise native SDKs as early as possible (requires dev build).
initSentry()
initPurchases()

function RootLayoutNav() {
  const { user, isLoading } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  useOTAUpdates()
  useEntitlementCheck()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (user && inAuthGroup) {
      if (!user.onboardingCompletedAt) {
        router.replace('/onboarding')
      } else {
        router.replace('/(app)/(tabs)')
      }
    } else if (user && inOnboarding && user.onboardingCompletedAt) {
      router.replace('/(app)/(tabs)')
    }
  }, [user, isLoading, segments, router])

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

  const { theme } = useTheme()

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Slot />
      <EnvironmentBadge />
    </>
  )
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}

export default RootLayout
