import * as SentryNative from '@sentry/react-native'

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN

export function initSentry(): void {
  if (__DEV__ || !dsn) return
  SentryNative.init({
    dsn,
    enabled: !__DEV__,
    environment: process.env.EXPO_PUBLIC_APP_VARIANT ?? 'production',
    tracesSampleRate: 0.2,
  })
}

export const Sentry = {
  captureException: (error: unknown, extra?: Record<string, unknown>): void => {
    if (__DEV__ || !dsn) return
    SentryNative.captureException(error, extra ? { extra } : undefined)
  },
  wrap: <T>(component: T): T => {
    if (__DEV__ || !dsn) return component
    return SentryNative.wrap(component as Parameters<typeof SentryNative.wrap>[0]) as T
  },
}

export function sentryIdentifyUser(id: string, email: string): void {
  if (__DEV__ || !dsn) return
  SentryNative.setUser({ id, email })
}

export function sentryClearUser(): void {
  if (__DEV__ || !dsn) return
  SentryNative.setUser(null)
}

export function sentryTrackSignUp(): void {
  if (__DEV__ || !dsn) return
  SentryNative.addBreadcrumb({ category: 'auth', message: 'User signed up', level: 'info' })
}
