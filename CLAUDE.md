# Gitlist

A native to-do list app backed by GitHub Project boards (Projects v2 GraphQL API).

## WORKFLOW RULES — READ FIRST

**NEVER implement features directly.** All feature work goes through tickets.

When Danny asks for tickets or mentions work that needs doing:
1. Write each ticket as a **plain-text block** with: Title, Category, Priority, Size, and Body (with `## Overview` and `## Acceptance Criteria` sections)
2. Danny copies each ticket into the **Claude Code CLI** which runs `/create-ticket`
3. The CLI creates the GitHub issue on Mission Control with correct labels and board fields
4. The CLI then picks up the ticket and does the implementation

**Do NOT:**
- Run `gh issue create` or create tickets programmatically
- Start coding features, fixing bugs, or making changes to app code
- Implement anything yourself — always write it as a ticket for the CLI

**Cowork's role:** planning, writing tickets, updating docs/context files, and reviewing.
**CLI's role:** implementation, PRs, code changes.

See also: `~/.claude/memory.md` for global workflow preferences.

---

## Tech stack

- **Framework**: Expo SDK 55 + React Native 0.83
- **Navigation**: Expo Router (file-based, tab bar + stack)
- **Language**: TypeScript (strict, typed routes)
- **Auth**: Supabase via @supabase/supabase-js + AsyncStorage (GitHub OAuth — sole sign-in method)
- **GitHub integration**: GitHub Projects v2 GraphQL API, OAuth token from Supabase auth
- **State**: Zustand
- **Local cache**: MMKV (`react-native-mmkv`) — synchronous, fast, requires dev build
- **Validation**: Zod (via @trustdesign/shared)
- **Shared code**: @trustdesign/shared (types, schemas, tokens, Supabase client factory)
- **Notifications**: expo-notifications
- **OTA Updates**: expo-updates
- **Deep linking**: URL scheme `gitlist://`
- **Error monitoring**: Sentry (`@sentry/react-native`) — requires dev build (see ticket #62)
- **Auth browser**: expo-web-browser (in-app Safari sheet for OAuth flow)

## Architecture

```
Phone → Local cache (MMKV) → Sync engine → GitHub GraphQL API
                                         → Supabase (user/billing only)
```

- **GitHub owns task data** — boards, columns, items, labels, assignees
- **Supabase owns user data** — accounts, OAuth tokens (via SecureStore), billing/subscriptions
- Multi-board support from v1

## Project structure

```
app/                    # Expo Router file-based routes
├── _layout.tsx         # Root layout (AuthProvider, ErrorBoundary, auth guard)
├── (auth)/             # Unauthenticated screens
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   └── callback.tsx    # Supabase auth callback (email confirm / OAuth)
├── (app)/              # Authenticated screens
│   ├── (tabs)/         # Bottom tab navigation
│   │   ├── index.tsx   # Boards list
│   │   ├── today.tsx   # Today tab — tasks due today across all boards
│   │   └── account.tsx # Account tab
│   ├── board/          # Board detail → task list (swipe to complete/delete)
│   ├── task/           # Task detail view (prev/next navigation)
│   ├── paywall/        # In-app purchase paywall (full-screen modal)
│   ├── profile/        # Edit profile
│   └── settings/       # App settings (notifications, appearance, IAP)
└── onboarding/         # First-run flow
src/
├── components/         # Reusable components (AuthProvider, ErrorBoundary, EntitlementGate)
├── hooks/              # Custom hooks (useCurrentUser, useEntitlementCheck)
├── lib/                # Supabase, GitHub, auth, cache (MMKV), purchases, Sentry
├── stores/             # Zustand stores (auth-store, boards-store, entitlement-store)
└── types/              # Type re-exports from shared package
```

## Auth flow

1. Root layout checks `useAuthStore` for user state
2. No user → redirect to `(auth)/sign-in`
3. User signs in via GitHub OAuth (sole auth method — email auth disabled in Supabase)
4. `auth.ts` uses `WebBrowser.openAuthSessionAsync` for in-app Safari OAuth sheet
5. On callback, `deep-links.ts` extracts `access_token`, `refresh_token`, and `provider_token` from hash
6. `provider_token` (GitHub OAuth token) stored in SecureStore via `storeGithubToken`
7. Authenticated user → onboarding (if first time) → `(app)/(tabs)` (boards list)

## GitHub OAuth

GitHub is the sole sign-in method. The OAuth App is owned by the trustdesign-io org.
The GitHub OAuth token (provider_token) is captured during sign-in and stored in
expo-secure-store. This token is used for all GitHub Projects v2 GraphQL API calls.
Scopes: `read:user read:org project`.

## Shared package

This project uses `@trustdesign/shared` installed as a Git dependency.
Shared code must be platform-agnostic — no DOM, no Next.js, no web-only APIs.

Types like `User`, `Role`, and `ActionResult` come from the shared package.
Zod schemas (`SignInSchema`, `SignUpSchema`) are shared with starter-web.
The Supabase client factory from the shared package is configured with
AsyncStorage for React Native session persistence.

## Design approach

Platform-native feel — follows iOS HIG and Material Design guidelines.
Uses system fonts, native navigation patterns, and platform-appropriate
styling (e.g. elevation on Android, shadows on iOS).

## Dev build requirement

Development uses Expo dev builds (not Expo Go). Build via EAS:

```bash
eas build --profile development --platform ios
```

The development profile targets the iOS Simulator (`ios.simulator: true`).
Native modules in use that require a dev build:
- **MMKV** (`react-native-mmkv`) — synchronous storage for cache
- **ReanimatedSwipeable** (`react-native-gesture-handler/ReanimatedSwipeable`) — swipeable task rows
- **RevenueCat** (`react-native-purchases`) — in-app purchase
- **Sentry** (`@sentry/react-native`) — crash reporting (ticket #62)

Other constraints:
- **`.npmrc`** — `legacy-peer-deps=true` (required for Expo SDK 55)
- **Xcode 16.2 + Expo SDK 55** — local `npx expo run:ios` fails; use EAS cloud builds or Xcode 26+

## Commands

```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run in browser
npm run type-check     # TypeScript type checking
```

## Setup

1. Copy `.env.example` to `.env` and fill in Supabase credentials
2. `npm install`
3. `npm start`

See `docs/SETUP.md` for full setup instructions including EAS Build.

## Deep linking

URL scheme: `gitlist://`

Auth callback: `gitlist://callback`
- PKCE code flow: `gitlist://callback?code=<code>`
- Implicit (OAuth hash) flow: `gitlist://callback#access_token=...&refresh_token=...`

`AuthProvider` listens for incoming deep links (`Linking.addEventListener`) and cold-start
URLs (`Linking.getInitialURL`) and calls `handleAuthDeepLink()` from `src/lib/deep-links.ts`.
The callback screen handles PKCE code exchange directly via `useLocalSearchParams`.

Supabase redirect URLs to configure (Authentication → URL Configuration):
```
gitlist://callback
exp://localhost:8081/--/callback   # Expo Go development
```

Test locally:
```bash
npx uri-scheme open "gitlist://callback?code=test" --ios
```

## EAS Build

EAS project ID: `285003f0-7bb7-49dc-9cd9-d676ee46b3f9` ← UPDATE after running `eas init`

```bash
eas build --profile development --platform ios   # iOS Simulator dev build
eas build --profile preview --platform all        # Internal TestFlight / Firebase
eas build --profile production --platform all     # App Store / Play Store
```

Build profiles in `eas.json`:
- `development` — iOS Simulator, expo-dev-client, channel: development
- `preview` — device distribution, channel: preview
- `production` — store distribution, auto-increment version, channel: production

## OTA Updates

`expo-updates` is configured with the EAS project. Update channels match EAS Build profiles:

| Channel | Profile | Audience |
|---------|---------|----------|
| development | development | Developers |
| preview | preview | Internal testers |
| production | production | End users |

The `useOTAUpdates` hook (wired into root layout) checks for updates on app launch and on
each foreground event. When an update is available it prompts the user to restart.
Disabled automatically in dev mode (`__DEV__` / `Updates.isEnabled`).

```bash
# Push an OTA update (JS/assets only -- no native code changes)
eas update --channel production --message "Fix: sign-in crash on iOS 17"
```

## Ticket & Issue Rules

**Never create issues with `gh issue create` directly.** Always use the
`/create-ticket` command from trustdesign-setup. It applies the correct
label, adds the issue to Mission Control, and sets Priority, Size, and
Category fields on the board.

**Never implement features directly.** See WORKFLOW RULES at the top of this file.
