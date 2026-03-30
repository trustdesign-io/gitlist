# starter-native

React Native (Expo) starter template for trustdesign projects.

> **Naming convention:** All starter repos use `starter-{platform}` format.

## Tech stack

- **Framework**: Expo SDK 55 + React Native 0.83
- **Navigation**: Expo Router (file-based, tab bar + stack)
- **Language**: TypeScript (strict, typed routes)
- **Auth**: Supabase via @supabase/supabase-js + AsyncStorage
- **State**: Zustand
- **Validation**: Zod (via @trustdesign/shared)
- **Shared code**: @trustdesign/shared (types, schemas, tokens, Supabase client factory)
- **Notifications**: expo-notifications
- **OTA Updates**: expo-updates
- **Deep linking**: URL scheme `starter-native://`
- **Error monitoring**: @sentry/react-native (optional — disabled when `EXPO_PUBLIC_SENTRY_DSN` is unset)

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
│   │   ├── index.tsx   # Home tab
│   │   ├── explore.tsx # Explore tab
│   │   └── account.tsx # Account tab
│   ├── profile/        # Profile editing (stack push)
│   └── settings/       # App settings (stack push)
└── onboarding/         # First-run onboarding flow
src/
├── components/         # Reusable components (AuthProvider, ErrorBoundary)
├── hooks/              # Custom hooks (useCurrentUser)
├── lib/                # Supabase client, auth functions, notifications
├── stores/             # Zustand stores (auth-store)
└── types/              # Type re-exports from shared package
```

## Auth flow

1. Root layout checks `useAuthStore` for user state
2. No user → redirect to `(auth)/sign-in`
3. User without `onboardingCompletedAt` → redirect to `onboarding`
4. Authenticated user → `(app)/(tabs)` (home)

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

URL scheme: `starter-native://`

Auth callback: `starter-native://callback`
- PKCE code flow: `starter-native://callback?code=<code>`
- Implicit (OAuth hash) flow: `starter-native://callback#access_token=...&refresh_token=...`

`AuthProvider` listens for incoming deep links (`Linking.addEventListener`) and cold-start
URLs (`Linking.getInitialURL`) and calls `handleAuthDeepLink()` from `src/lib/deep-links.ts`.
The callback screen handles PKCE code exchange directly via `useLocalSearchParams`.

Supabase redirect URLs to configure (Authentication → URL Configuration):
```
starter-native://callback
exp://localhost:8081/--/callback   # Expo Go development
```

Test locally:
```bash
npx uri-scheme open "starter-native://callback?code=test" --ios
```

## EAS Build

EAS project ID: `285003f0-7bb7-49dc-9cd9-d676ee46b3f9`

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
