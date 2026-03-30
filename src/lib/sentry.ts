import * as Sentry from '@sentry/react-native'

/**
 * Initialise Sentry. Call once at app startup, before rendering.
 *
 * Requires EXPO_PUBLIC_SENTRY_DSN in the environment. If the variable is
 * absent Sentry is silently skipped — the app runs normally without reporting.
 *
 * Sentry is disabled in __DEV__ so local development stays noise-free.
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    enabled: !__DEV__,
    // Capture 20% of transactions for performance monitoring
    tracesSampleRate: 0.2,
  })
}

/**
 * Called after a successful sign-in or token refresh.
 * Associates the Sentry session with the authenticated user.
 */
export function sentryIdentifyUser(userId: string, email: string): void {
  Sentry.setUser({ id: userId, email })
  Sentry.addBreadcrumb({ category: 'auth', message: 'Signed in', level: 'info' })
}

/** Called after a successful sign-up (before email confirmation). */
export function sentryTrackSignUp(): void {
  Sentry.addBreadcrumb({ category: 'auth', message: 'Signed up', level: 'info' })
}

/** Called when the user completes onboarding. */
export function sentryTrackOnboardingComplete(): void {
  Sentry.addBreadcrumb({ category: 'onboarding', message: 'Onboarding completed', level: 'info' })
}

/**
 * Clears the Sentry user identity on sign-out.
 * Subsequent errors won't be linked to a user.
 */
export function sentryClearUser(): void {
  Sentry.setUser(null)
  Sentry.addBreadcrumb({ category: 'auth', message: 'Signed out', level: 'info' })
}

export { Sentry }
