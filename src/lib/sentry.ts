// Sentry stubs — Sentry is not yet configured for Gitlist.
// These no-op exports prevent import errors across the codebase.
// Replace with real @sentry/react-native integration when ready.

export const Sentry = {
  captureException: (..._args: unknown[]) => {},
  wrap: <T>(component: T): T => component,
}

export const initSentry = () => {}
export const sentryIdentifyUser = (_id: string, _email: string) => {}
export const sentryClearUser = () => {}
export const sentryTrackSignUp = () => {}
