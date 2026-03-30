import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider } from '../components/AuthProvider'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { EnvironmentBadge } from '../components/EnvironmentBadge'
import { useAuthStore } from '../stores/auth-store'
import { useGithubStore } from '../stores/github-store'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'
import { useOTAUpdates } from '../hooks/useOTAUpdates'
import { initSentry, Sentry } from '../lib/sentry'

SplashScreen.preventAutoHideAsync()
// Called at module evaluation time so Sentry is ready before any component renders
initSentry()

function RootLayoutNav() {
  const { user, isLoading: authLoading } = useAuthStore()
  const { isPatLinked, isLoading: githubLoading } = useGithubStore()
  const segments = useSegments()
  const router = useRouter()
  useOTAUpdates()

  useEffect(() => {
    // Wait for both auth and GitHub state to resolve
    if (authLoading || githubLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'
    const segs = segments as string[]
    const inLinkGithub = segs[0] === '(app)' && segs[1] === 'link-github'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (user && inAuthGroup) {
      if (!user.onboardingCompletedAt) {
        router.replace('/onboarding')
      } else if (!isPatLinked) {
        router.replace('/(app)/link-github')
      } else {
        router.replace('/(app)/(tabs)')
      }
    } else if (user && inOnboarding && user.onboardingCompletedAt) {
      if (!isPatLinked) {
        router.replace('/(app)/link-github')
      } else {
        router.replace('/(app)/(tabs)')
      }
    } else if (user && user.onboardingCompletedAt && !isPatLinked && !inLinkGithub) {
      router.replace('/(app)/link-github')
    }
  }, [user, authLoading, isPatLinked, githubLoading, segments, router])

  useEffect(() => {
    if (!authLoading) {
      SplashScreen.hideAsync()
    }
  }, [authLoading])

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
