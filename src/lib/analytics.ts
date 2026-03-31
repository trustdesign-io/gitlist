import PostHog from 'posthog-react-native'

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY

let client: PostHog | null = null

/**
 * Initialise PostHog. Call once at app startup (after Sentry).
 * No-ops in dev or when the API key is not configured.
 */
export function initAnalytics(): void {
  if (__DEV__ || !apiKey) return
  try {
    client = new PostHog(apiKey, { host: 'https://us.i.posthog.com' })
  } catch {
    // Defensive: any unexpected SDK init failure must not crash the app
    // before error boundaries are mounted.
  }
}

/**
 * Track a screen view. Called automatically by useScreenTracking.
 * Path is the Expo Router pathname — no user identifiers are included.
 */
export function captureScreen(path: string): void {
  if (!client) return
  client.screen(path, { path })
}

/** Tracked event names — kept in one place to avoid typos. */
export type AnalyticsEvent =
  | 'board_opened'
  | 'task_opened'
  | 'task_status_changed'
  | 'purchase_started'
  | 'purchase_completed'

/**
 * Track a discrete user action.
 * Props must NOT contain PII (no names, emails, or GitHub usernames).
 */
export function captureEvent(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>
): void {
  if (!client) return
  client.capture(event, props)
}
