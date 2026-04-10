# Plan: Gitlist

Generated from PRD.md on 2026-03-31.
Each item maps to one GitHub issue on Mission Control.

---

## Phase 1 — Critical UX fixes (Todo)

These are gaps in the current app that block a good experience. Ship these first.

1. **Task-to-task navigation on board screen**
   - Prev/next buttons or swipe gesture to move between tasks in a board without returning to the list
   - Category: Feature | Priority: Critical | Size: M

2. **Today view screen**
   - New tab showing tasks due today or updated recently, aggregated across all boards
   - Category: Feature | Priority: Critical | Size: L

---

## Phase 2 — Polish & completeness (Backlog)

3. **Consistent safe area insets audit**
   - Verify every screen applies insets correctly — top, bottom, and keyboard
   - Category: Bug | Priority: High | Size: S

4. **Pull-to-refresh on Today view**
   - Refresh control wired to re-fetch across all boards
   - Category: Feature | Priority: High | Size: S

5. **Offline read cache — boards and tasks**
   - AsyncStorage cache for last-known board and task state, shown while fetching
   - Category: Feature | Priority: High | Size: M

6. **Optimistic status updates**
   - Task status changes update the UI immediately, roll back on API error
   - Category: Feature | Priority: Medium | Size: M

7. **Empty and error states audit**
   - Review all screens for missing empty states, error states, and loading skeletons
   - Category: Chore | Priority: Medium | Size: S

---

## Phase 3 — Monetisation (Backlog)

8. **RevenueCat integration — setup**
   - Install react-native-purchases, configure App Store product, entitlements
   - Category: Feature | Priority: Critical | Size: M

9. **Paywall screen**
   - One-time purchase screen shown to free users, restore purchases button
   - Category: Feature | Priority: Critical | Size: M

10. **Entitlement gate**
    - Lock board detail and Today view behind entitlement check, free tier shows paywall
    - Category: Feature | Priority: Critical | Size: S

---

## Phase 4 — Observability (Backlog)

11. **Migrate to Expo dev build**
    - Move from Expo Go to a custom dev build to unblock native modules
    - Category: Chore | Priority: High | Size: M

12. **Activate Sentry crash reporting**
    - Replace no-op stub with real @sentry/react-native (requires dev build)
    - Category: Chore | Priority: High | Size: S

13. **PostHog analytics**
    - Install posthog-react-native, track screen views and key actions (board open, task open, purchase)
    - Category: Feature | Priority: Medium | Size: S

---

## Phase 5 — Launch readiness (Backlog)

14. **App Store assets**
    - Screenshots (6.9", 6.5", iPad), app icon all sizes, App Store description and keywords
    - Category: Chore | Priority: High | Size: M

15. **App Store review compliance audit**
    - Privacy policy, data usage disclosure, IAP compliance, age rating
    - Category: Chore | Priority: Critical | Size: S

16. **Performance audit**
    - Cold start time, board load time, memory profile — target < 2s launch, < 1.5s board load
    - Category: Chore | Priority: Medium | Size: S

17. **Accessibility audit**
    - VoiceOver labels on all interactive elements, minimum touch targets 44pt, dynamic type support
    - Category: Chore | Priority: Medium | Size: M

18. **TestFlight beta**
    - EAS preview build, internal TestFlight distribution, smoke test all core flows
    - Category: Chore | Priority: High | Size: S

19. **Production EAS build + App Store submission**
    - Final production build, submit for App Store review
    - Category: Chore | Priority: Critical | Size: S
