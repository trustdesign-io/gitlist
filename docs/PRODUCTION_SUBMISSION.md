# Production Build & App Store Submission

Step-by-step guide to building and submitting Gitlist to the App Store.

**Bundle ID:** `io.trustdesign.gitlist`
**EAS Project ID:** `285003f0-7bb7-49dc-9cd9-d676ee46b3f9`

---

## Prerequisites

1. EAS CLI installed and logged in:
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Environment variables set (locally or in EAS Secrets):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - `EXPO_PUBLIC_PRIVACY_POLICY_URL` (live URL)
   - `EXPO_PUBLIC_TERMS_URL` (live URL)
   - `APPLE_ID`
   - `ASC_APP_ID`
   - `APPLE_TEAM_ID`

3. App Store Connect app record created with bundle ID `io.trustdesign.gitlist`

4. App Store Connect → In-App Purchases: non-consumable product configured with
   product ID matching the RevenueCat entitlement (identifier: `pro`)

---

## Step 1 — Bump the version

Use the release script to bump version and tag:

```bash
# Patch release (1.0.0 → 1.0.1)
npm run release:patch

# Minor release (1.0.0 → 1.1.0)
npm run release:minor
```

The script updates `app.json` version and creates a git tag. Build number is
auto-incremented by EAS (`autoIncrement: true` in `eas.json`).

---

## Step 2 — Run pre-flight checks

Before building, complete the App Store compliance checklist:
see `docs/APP_STORE_COMPLIANCE.md`

Key items:
- [ ] Privacy policy live at `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- [ ] Terms of service live at `EXPO_PUBLIC_TERMS_URL`
- [ ] Age rating set to **4+** in App Store Connect
- [ ] App privacy nutrition label completed

---

## Step 3 — Trigger production EAS build

```bash
eas build --profile production --platform ios
```

EAS will:
- Auto-increment the build number (`autoIncrement: true`)
- Set `EXPO_PUBLIC_APP_VARIANT=production` (hides dev badge)
- Sign with the distribution certificate and provisioning profile
- Upload the `.ipa` to EAS servers

Monitor progress: `eas build:list` or https://expo.dev/accounts/designtechnologist/projects/gitlist/builds

---

## Step 4 — Submit to App Store

Once the build is complete:

```bash
eas submit --profile production --platform ios --latest
```

This uses credentials from `eas.json` (`$APPLE_ID`, `$ASC_APP_ID`, `$APPLE_TEAM_ID`).
The build is uploaded to App Store Connect as a new TestFlight build.

---

## Step 5 — TestFlight internal testing

1. Open App Store Connect → TestFlight
2. Add internal testers
3. Test purchase flow with sandbox accounts
4. Test restore purchases
5. Verify deep links work (`gitlist://callback`)
6. Verify OTA update prompt appears (if pushing an update mid-test)

---

## Step 6 — Submit for App Store Review

In App Store Connect:
1. Select the TestFlight build for submission
2. Complete the submission checklist:
   - App information (name, subtitle, keywords, description)
   - Screenshots for all required device sizes (see ticket #64)
   - Support URL and contact email
   - App review information (no special reviewer access needed — GitHub OAuth only)
3. Submit for review

Expected review time: 1–3 business days.

---

## Troubleshooting

**Build fails with missing entitlements**
- Ensure provisioning profile includes `aps-environment` (push notifications)
- Check that `expo-notifications` plugin is in `app.json`

**Submit fails with authentication error**
- Verify `APPLE_ID`, `ASC_APP_ID`, `APPLE_TEAM_ID` are correct
- Try `eas credentials` to inspect/reset certificates

**RevenueCat products not loading**
- Confirm the product is in "Ready to Submit" state in App Store Connect
- Confirm `EXPO_PUBLIC_REVENUECAT_IOS_KEY` is the iOS public key, not the secret key

**OTA update not working in production**
- Confirm `channel: production` in `eas.json` production profile
- Push an update: `eas update --channel production --message "description"`
