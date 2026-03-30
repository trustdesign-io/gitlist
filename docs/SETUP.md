# Project Setup

Step-by-step instructions for setting up starter-native from scratch.

---

## 1. Prerequisites

Ensure the following are installed before proceeding:

- **Node.js** (v20+ recommended) and **npm**
- **Expo CLI** — `npm install -g expo`
- **EAS CLI** — `npm install -g eas-cli`
- **GitHub CLI** (`gh`) — authenticated to the `trustdesign-io` organisation
- **Xcode** (macOS only, for iOS simulator)
- **Android Studio** (for Android emulator) with a virtual device configured

Required accounts:

- **GitHub** — member of the `trustdesign-io` organisation with repo write access
- **Supabase** — project already created, or permission to create one
- **Expo / EAS** — account at expo.dev, with access to the project

---

## 2. Clone and install

```bash
git clone https://github.com/trustdesign-io/starter-native.git
cd starter-native
npm install
```

---

## 3. Environment Variables

Copy `.env.example` to `.env` and fill in every value before running:

```bash
cp .env.example .env
```

### Where to find each value

**`EXPO_PUBLIC_SUPABASE_URL`**
→ Supabase dashboard → Project → Settings → API → **Project URL**

**`EXPO_PUBLIC_SUPABASE_ANON_KEY`**
→ Supabase dashboard → Project → Settings → API → **anon / public** key

> **Security note:** Prefix `EXPO_PUBLIC_` means this value is bundled into the app
> binary and visible to users. Use only the anon key here — never the service role key.
> Protect data with Supabase Row Level Security (RLS) policies.

### Complete `.env` example

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 4. Supabase Configuration

### Auth settings

In the Supabase dashboard → **Authentication → URL Configuration**:

Add the following redirect URLs to support deep linking from email confirmations and
password reset flows:

```
starter-native://callback
exp://localhost:8081/--/callback
```

> **Why `//callback` not `//auth/callback`?**
> Expo Router route groups like `(auth)` are transparent in URLs — they don't
> add path segments. The file `src/app/(auth)/callback.tsx` is accessible at
> `starter-native://callback`, not `starter-native://auth/callback`.

The `exp://` URL is needed during development on a physical device via Expo Go.

### Auth providers

By default the app supports email/password. To add OAuth:

1. Supabase dashboard → Authentication → Providers → enable the desired provider
2. Add redirect URL: `starter-native://callback`
3. Configure the OAuth app credentials (Client ID, Client Secret) in Supabase

### Testing deep links locally

```bash
# iOS simulator
npx uri-scheme open "starter-native://callback?code=test" --ios

# Android emulator
npx uri-scheme open "starter-native://callback?code=test" --android
```

---

## 5. app.json Configuration

Two placeholders in `app.json` must be replaced:

**EAS Project ID** — replace `YOUR_PROJECT_ID` in both locations:

```json
{
  "updates": {
    "url": "https://u.expo.dev/YOUR_PROJECT_ID"
  },
  "extra": {
    "eas": {
      "projectId": "YOUR_PROJECT_ID"
    }
  }
}
```

To get your EAS project ID:

```bash
eas init
```

This creates the project on expo.dev and writes the ID to `app.json` automatically.

---

## 6. Running Locally

### iOS simulator (macOS only)

```bash
npm run ios
```

### Android emulator

```bash
npm run android
```

### Expo Go (physical device — quickest start)

```bash
npm start
```

Scan the QR code with the **Expo Go** app (iOS or Android). Note: some native modules
(push notifications, expo-updates) require a development build, not Expo Go.

### Development build (full native capability)

```bash
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

Install the resulting `.ipa` or `.apk` on a device or simulator, then:

```bash
npm start
```

---

## 7. Type Checking

```bash
npm run type-check
```

This runs `tsc --noEmit` in strict mode. All PRs must pass this before opening.

> **Other scripts not yet configured:**
> - `npm run lint` — requires ESLint setup (ticket #3)
> - `npm run test` — requires Jest setup (ticket #4)
> - `npm run format` — requires Prettier setup (ticket #3)
> - `npm run build` — requires EAS Build config (ticket #6)

---

## 8. EAS Build Setup

Ensure `eas.json` is configured with at least `development`, `preview`, and `production`
profiles. See [EAS Build documentation](https://docs.expo.dev/build/introduction/) for details.

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

---

## 9. OTA Updates

The app is configured with `expo-updates` for over-the-air JS-layer updates.

To publish an update:

```bash
eas update --branch production --message "Update: fix sign-in validation"
```

OTA updates are available immediately to users on the same runtime version.
Binary updates (new native modules, `app.json` changes) still require a full EAS Build.

---

## 10. Sentry Error Monitoring

Sentry is optional — the app runs normally without it. To enable:

### Create a Sentry project

1. Sign in at [sentry.io](https://sentry.io) → **New Project** → **React Native**
2. Note your **DSN** from: Project → Settings → Client Keys (DSN)
3. Note your **organisation slug** and **project slug** from the URL

### Configure app.json

Replace the placeholder values in `app.json`:

```json
["@sentry/react-native/expo", {
  "organization": "your-sentry-org-slug",
  "project": "starter-native"
}]
```

### Set environment variables

Add to `.env`:

```
EXPO_PUBLIC_SENTRY_DSN=https://YOUR_KEY@oXXXXXX.ingest.sentry.io/YOUR_PROJECT_ID
```

### Set EAS secret for source map uploads

Source maps are uploaded automatically during EAS Build when `SENTRY_AUTH_TOKEN` is set.
Generate a token at Sentry → Account → API tokens → Create New Token (scope: `project:releases`).

```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value YOUR_TOKEN
```

This secret is automatically injected into EAS Build environments — no further config needed.

### Verifying

- Sentry is **disabled in `__DEV__`** — errors won't appear in your Sentry dashboard during local development.
- To test in production mode: use a preview or production EAS Build with `EXPO_PUBLIC_SENTRY_DSN` set.
- User events (sign in, sign up, onboarding complete) appear as breadcrumbs on each Sentry error event.

---

## 11. First Login

1. Start the app and tap **Sign up**
2. Enter name, email, and password
3. Check email for a confirmation link (from Supabase Auth)
4. After confirming, sign in — the onboarding flow runs once, then lands on Home
5. The session persists across app restarts via AsyncStorage

---

## 11. E2E Tests with Maestro

[Maestro](https://maestro.mobile.dev) runs YAML flow files against a running development build. It does **not** work with Expo Go — you need an actual device or simulator build.

### Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Verify: `maestro --version`

### Run a flow

```bash
# Start a development build first
npx expo run:ios          # iOS simulator
npx expo run:android      # Android emulator

# Then in a separate terminal
maestro test maestro/sign-in-tabs-sign-out.yaml
maestro test maestro/sign-up-onboarding-home.yaml
```

### Run all flows

```bash
maestro test maestro/
```

### Available flows

| File | What it tests |
|------|--------------|
| `sign-in-tabs-sign-out.yaml` | Sign in → navigate all tabs → sign out |
| `sign-up-onboarding-home.yaml` | Sign up → complete onboarding → reach home |

### Before running sign-up flow

The sign-up flow uses `e2e+signup@example.com`. Because Supabase prevents duplicate registrations you must either:
- Delete the account in the Supabase dashboard between runs, or
- Change the email in the YAML to a fresh address before each run.

### CI integration

Maestro flows can be run in CI against a preview EAS build using the [Maestro Cloud](https://cloud.mobile.dev) action or by running the CLI in a macOS GitHub Actions runner. See the Maestro docs for the GitHub Actions integration. This is a future enhancement — the current setup is local-only.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Could not connect to development server` | Metro bundler not running | Run `npm start` |
| Auth redirect not working | Supabase redirect URL missing | Add `starter-native://auth/callback` to Supabase URL config |
| Push notifications not arriving | Permissions not granted | Check device Settings → Notifications → [App] |
| OTA update not applying | Runtime version mismatch | Rebuild with `eas build` |
| `Module not found: @trustdesign/shared` | Package not installed | Run `npm install` |
