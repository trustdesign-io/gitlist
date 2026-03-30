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
import { initSentry, Sentry } from '../lib/sentry'

SplashScreen.preventAutoHideAsync()
// Called at module evaluation time so Sentry is ready before any component renders
initSentry()

function RootLayoutNav() {
  const { user, isLoading } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  useOTAUpdates()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (user && inAuthGroup) {
      // Check if onboarding is needed
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
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

// Sentry.wrap instruments the root component for native crash reporting
// and unhandled promise rejection tracking
export default Sentry.wrap(RootLayout)
