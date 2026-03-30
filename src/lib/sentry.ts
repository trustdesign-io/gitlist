/**
 * Sentry stubs — Sentry is not configured yet.
 * Replace with real @sentry/react-native implementation when a DSN is available.
 */

import type React from 'react'

export function initSentry(): void {}

export function sentryIdentifyUser(_userId: string, _email: string): void {}

export function sentryTrackSignUp(): void {}

export function sentryClearUser(): void {}

// Stub that matches the @sentry/react-native surface used in this project
export const Sentry = {
  wrap: <T extends React.ComponentType>(component: T): T => component,
  captureException: (_error: unknown, _context?: object): void => {},
}
