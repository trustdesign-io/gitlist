# PRD: Gitlist

**Version:** 1.0
**Date:** 2026-03-31
**Status:** Draft

---

## Overview

Gitlist is a minimalist native iOS to-do app backed by GitHub Projects v2. It gives GitHub users a calm, focused task management experience — simple enough for everyday use, powerful enough to surface the full depth of GitHub Projects when needed. It is sold as a one-time purchase on the App Store.

## Problem Statement

GitHub Projects v2 is a capable project management tool, but it has no native mobile app and no simple to-do interface. Developers who live in GitHub have no clean way to manage their tasks on the go. Generic to-do apps don't understand GitHub. Gitlist bridges that gap.

## Target Audience

GitHub users — developers, solo builders, and small teams — who want a simple, beautiful native task manager that uses their existing GitHub Projects boards as the data layer. They value focus and calm over feature density.

## Product Type

Native mobile app — iOS-first, App Store, one-time purchase.

---

## Screens & Routes

### Auth screens
| Screen | Notes |
|--------|-------|
| Sign in | GitHub OAuth via Supabase, in-app Safari sheet |
| Callback | Handles OAuth callback + PKCE code exchange |

### Onboarding
| Screen | Notes |
|--------|-------|
| Onboarding | First-run: GitHub OAuth → token confirmation |

### Main app (tab bar)
| Screen | Notes |
|--------|-------|
| Boards list | Home tab — lists all GitHub Projects boards |
| Today view | Tasks due or relevant today, across all boards |
| Account | User profile, sign out |

### Stack screens (pushed over tabs)
| Screen | Notes |
|--------|-------|
| Board detail | Task list for a specific board |
| Task detail | Full task view with prev/next navigation between tasks |
| Profile | User profile editing |
| Settings | App preferences, PAT management |

---

## Brand

### Identity
- **Name:** Gitlist
- **Personality:** Focused, calm, developer-native, intentional
- **Tone of voice:** Calm and direct — no marketing fluff, no exclamation marks, no emoji in UI copy
- **References:** Minimalist (iOS todo app) — the primary UI reference. Clean flat task list, generous spacing, inline detail cards, no chrome. Also Things 3 for overall polish and restraint.

### Visual direction
- **Colour:** System-adaptive — follows iOS light/dark mode. Accent colour is subtle, not loud.
- **Typography:** Clean sans-serif (SF Pro on iOS). No decorative type. Size and weight carry hierarchy.
- **Aesthetic:** Quiet and focused. Whitespace does the work. Avoid gradients, shadows-for-decoration, and busy layouts.
- **Design principle — show the task, hide the system:** GitHub metadata (priority, labels, assignees, status columns, custom fields) syncs behind the scenes but is hidden from the UI by default. A task is a title. Maybe a note. Maybe subtasks. That's it. Power users can enable metadata display via Settings toggles (e.g. "Show priority badges", "Show labels"), but the default experience is Minimalist-clean.
- **What to avoid:** Generic SaaS blue, card-heavy dashboards, notification badges on everything, artificial urgency, surfacing GitHub jargon (no "issues", "projects v2", "field values" in the UI)

### Design constraints
- All interactive elements must have pressed/highlighted states
- Minimum touch target 44pt
- Respect safe area insets on all screens
- Support both light and dark mode from day one
- No custom fonts — SF Pro only (system font)

---

## Features & Requirements

### Must have (MVP)
- GitHub OAuth sign-in (sole auth method)
- Boards list — shows all GitHub Projects v2 boards
- Board detail — task list with status columns, label filter, search
- Task detail — full task view (title, description, status, labels, assignees, custom fields)
- Task-to-task navigation — prev/next arrows/swipe within a board's task list
- Today view — tasks due today or flagged as relevant, across all boards
- Safe area insets applied consistently on all screens
- System-adaptive light/dark mode
- One-time purchase via RevenueCat (IAP)
- Restore purchases

### Should have
- Pull-to-refresh on all list screens
- Optimistic UI for status changes
- Offline read support (cached last-known state)
- Unread indicators on boards with recent activity
- Quick-add task bar on board screen
- Sentry crash reporting (requires dev build)
- PostHog analytics (screen views, key actions)

### Nice to have
- Widget — Today tasks on iOS home screen
- Push notifications for task assignments and mentions
- Android support
- Drag-to-reorder tasks within a column
- Bulk status updates

---

## Technical Requirements

- **Stack:** Expo SDK 55, React Native 0.83, TypeScript (strict), Expo Router, Zustand, AsyncStorage
- **Auth:** Supabase (GitHub OAuth only), expo-web-browser, expo-secure-store
- **Data:** GitHub Projects v2 GraphQL API
- **Monetisation:** RevenueCat (one-time purchase, restore purchases)
- **Crash reporting:** Sentry (activate on move to dev build)
- **Analytics:** PostHog
- **Target device:** iOS-first
- **Performance targets:** App launch < 2s, board load < 1.5s on 4G

---

## Success Criteria

- [ ] All screens listed above implemented and navigable
- [ ] Task-to-task navigation works on board detail screen
- [ ] Today view shows tasks correctly across all boards
- [ ] Light and dark mode render correctly on all screens
- [ ] Safe area insets applied on all screens (no content clipped)
- [ ] RevenueCat IAP flow works end-to-end (purchase + restore)
- [ ] App passes App Store review
- [ ] No crash on cold start (Sentry clean)
- [ ] TypeScript strict — zero `any` types, clean type-check
