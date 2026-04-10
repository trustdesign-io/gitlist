/**
 * PostHog analytics - stubbed version (native module disabled for compilation).
 * All functions are no-ops to allow the app to compile without the posthog-react-native module.
 */

/**
 * Initialise PostHog. Call once at app startup (after Sentry).
 * No-ops in dev or when the API key is not configured.
 */
export function initAnalytics(): void {
  // No-op: PostHog initialization disabled
}

/**
 * Track a screen view. Called automatically by useScreenTracking.
 * Path is the Expo Router pathname — no user identifiers are included.
 */
export function captureScreen(path: string): void {
  // No-op: screen tracking disabled
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
  // No-op: event capture disabled
}
