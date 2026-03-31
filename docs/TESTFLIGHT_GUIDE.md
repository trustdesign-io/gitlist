# TestFlight Internal Beta Guide

How to build and distribute the Gitlist preview build via TestFlight.

**EAS Profile:** `preview`
**Distribution:** Internal (device-only, not simulator)
**Channel:** `preview` (receives OTA updates pushed to `preview` channel)

---

## Prerequisites

1. EAS CLI installed and logged in:
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Apple credentials set (in `.env` or EAS Secrets):
   - `APPLE_ID`
   - `ASC_APP_ID`
   - `APPLE_TEAM_ID`

3. App record exists in App Store Connect (same bundle ID: `io.trustdesign.gitlist`)

4. Environment variables set for preview:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - `EXPO_PUBLIC_SENTRY_DSN` (optional but recommended for beta)

---

## Step 1 — Trigger the preview build

```bash
eas build --profile preview --platform ios
```

Or use the npm script:
```bash
npm run eas:preview
```

The preview profile uses `distribution: "internal"` — EAS will sign the build
with an Ad Hoc provisioning profile for device distribution.

Build progress: https://expo.dev/accounts/designtechnologist/projects/gitlist/builds

---

## Step 2 — Submit to TestFlight

Once the build completes:

```bash
eas submit --profile production --platform ios --latest
```

This uploads the latest build to App Store Connect as a new TestFlight build.
The credentials come from `eas.json` (`$APPLE_ID`, `$ASC_APP_ID`, `$APPLE_TEAM_ID`).

---

## Step 3 — Add internal testers

1. Open App Store Connect → TestFlight → Internal Testing
2. Add testers by Apple ID
3. TestFlight will notify them by email

Internal testers can install directly from the TestFlight app.
No App Store review required for internal builds.

---

## Step 4 — Smoke test checklist

Test the following flows on a real device (not simulator) before marking the beta ready:

### Authentication
- [ ] Sign in with GitHub OAuth flow completes
- [ ] User is redirected to boards list after sign in
- [ ] Sign out clears the session and returns to sign-in screen

### Boards
- [ ] Boards list loads (live data from GitHub)
- [ ] Pull to refresh works
- [ ] Board card shows item count and last-updated time
- [ ] Tapping a board opens the board detail

### Board detail
- [ ] Tasks load grouped by column
- [ ] Swipe left to complete a task
- [ ] Swipe right to delete a task
- [ ] Filter by column works
- [ ] All-boards view shows tasks from all boards

### Task detail
- [ ] Task opens with correct title, status, body
- [ ] Prev/Next navigation between tasks works
- [ ] Back navigation returns to board

### Today view
- [ ] Today tab shows tasks due today
- [ ] Pull to refresh re-fetches from GitHub
- [ ] Empty state shown if no tasks due today

### In-app purchase
- [ ] Paywall appears for non-pro users
- [ ] Purchase flow completes with sandbox account
- [ ] Restore purchase works
- [ ] Pro content accessible after purchase

### Settings
- [ ] Appearance toggle changes theme
- [ ] Push notifications permission request works
- [ ] Privacy policy link opens
- [ ] Terms link opens
- [ ] Version number shown correctly

### General
- [ ] App launches without crash
- [ ] No errors in Sentry dashboard (if DSN configured)
- [ ] OTA update check runs silently on launch
- [ ] Deep link `gitlist://callback` handled correctly

---

## Pushing OTA updates during beta

For JS-only fixes that don't require a new native build:

```bash
eas update --channel preview --message "Fix: description of what changed"
```

Beta testers will receive the update the next time they open the app.

---

## Escalating to production

Once the beta smoke tests pass, follow `docs/PRODUCTION_SUBMISSION.md` to
submit the production build for App Store Review.
