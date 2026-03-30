# Gitlist

A native to-do list app backed by GitHub Project boards (Projects v2 GraphQL API).

## Tech stack

- **Framework**: Expo SDK 55 + React Native 0.83
- **Navigation**: Expo Router (file-based, tab bar + stack)
- **Language**: TypeScript (strict, typed routes)
- **Auth**: Supabase via @supabase/supabase-js + AsyncStorage (user accounts & billing)
- **GitHub integration**: GitHub Projects v2 GraphQL API, PAT-based auth (v1)
- **State**: Zustand
- **Local cache**: MMKV for offline task data
- **Validation**: Zod (via @trustdesign/shared)
- **Shared code**: @trustdesign/shared (types, schemas, tokens, Supabase client factory)
- **Notifications**: expo-notifications
- **OTA Updates**: expo-updates
- **Deep linking**: URL scheme `gitlist://`
- **Error monitoring**: @sentry/react-native (optional — disabled when `EXPO_PUBLIC_SENTRY_DSN` is unset)

## Architecture

```
Phone → Local cache (MMKV) → Sync engine → GitHub GraphQL API
                                         → Supabase (user/billing only)
```

- **GitHub owns task data** — boards, columns, items, labels, assignees
- **Supabase owns user data** — accounts, PAT storage, billing/subscriptions
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
│   │   └── account.tsx # Account tab
│   ├── board/          # Board detail → task list
│   ├── task/           # Task detail view
│   └── settings/       # App settings, PAT management
└── onboarding/         # First-run: sign up → link GitHub PAT
src/
├── components/         # Reusable components (AuthProvider, ErrorBoundary)
├── hooks/              # Custom hooks (useCurrentUser)
├── lib/                # Supabase client, GitHub GraphQL client, auth, notifications
├── stores/             # Zustand stores (auth-store, boards-store, tasks-store)
└── types/              # Type re-exports from shared package
```

## Auth flow

1. Root layout checks `useAuthStore` for user state
2. No user → redirect to `(auth)/sign-in`
3. User without GitHub PAT → redirect to PAT linking screen
4. Authenticated user with PAT → `(app)/(tabs)` (boards list)

## GitHub PAT linking

Users provide a GitHub Personal Access Token with `project` scope.
The PAT is stored securely in Supabase (encrypted) and used to query
the GitHub Projects v2 GraphQL API on behalf of the user.

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
