/**
 * Sentry error tracking - stubbed version (native module disabled for compilation).
 * All functions are no-ops to allow the app to compile without the @sentry/react-native module.
 */

export function initSentry(): void {
  // No-op: Sentry initialization disabled
}

export const Sentry = {
  captureException: (error: unknown, extra?: Record<string, unknown>): void => {
    // No-op: exception capture disabled
  },
  wrap: <T>(component: T): T => {
    // No-op: return component as-is
    return component
  },
}

export function sentryIdentifyUser(id: string, email: string): void {
  // No-op: user identification disabled
}

export function sentryClearUser(): void {
  // No-op: user clear disabled
}

export function sentryTrackSignUp(): void {
  // No-op: sign-up tracking disabled
}
