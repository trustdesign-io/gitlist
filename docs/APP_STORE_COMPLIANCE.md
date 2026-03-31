# App Store Review Compliance

This document tracks the App Store Review Guidelines compliance status for Gitlist.

**Bundle ID:** `io.trustdesign.gitlist`
**App type:** Native iOS app, one-time purchase (no subscription)

---

## Checklist

### Privacy (Guideline 5.1)

| Item | Status | Notes |
|------|--------|-------|
| Privacy policy live at public URL | ☐ TODO | Set `EXPO_PUBLIC_PRIVACY_POLICY_URL` in `.env.production` |
| Privacy policy linked in Settings screen | ✅ Done | Settings → About → Privacy policy |
| Terms of service linked in Settings screen | ✅ Done | Settings → About → Terms of service |
| App privacy nutrition label in App Store Connect | ☐ TODO | See data types below |

**Data types collected:**

| Category | Type | Use | Linked to user |
|----------|------|-----|----------------|
| Contact Info | Email address | Account, authentication | Yes |
| Identifiers | User ID | Primary account ID (Supabase) | Yes |
| Identifiers | GitHub OAuth token | Stored in SecureStore, sent only to GitHub API | Yes |
| Usage Data | App interactions | Not collected (no analytics yet) | N/A |

> When PostHog analytics is enabled (#63), update this table to include usage data.

---

### In-App Purchases (Guideline 3.1.1)

| Item | Status | Notes |
|------|--------|-------|
| One-time purchase (non-consumable) | ✅ Code | RevenueCat + App Store Connect product |
| No subscription masquerading as one-time | ✅ | Non-consumable only — no auto-renewing subscription |
| Restore purchases accessible without purchasing | ✅ Done | Settings → Purchase → Restore purchase |
| Restore purchases on paywall screen | ✅ Done | Paywall → Restore purchase |
| Paywall language is not misleading | ✅ | No aggressive upsell, no exclamation marks |

---

### Age Rating

| Item | Status | Notes |
|------|--------|-------|
| Age rating set in App Store Connect | ☐ TODO | Set to **4+** (no objectionable content) |
| No mature content | ✅ | Developer tool — no user-generated content exposed |

---

### Technical

| Item | Status | Notes |
|------|--------|-------|
| No private APIs used | ✅ | Audit complete — all public APIs only |
| Deep link URL scheme documented | ✅ | See below |
| No 3rd-party analytics SDKs (without consent) | ✅ | PostHog pending (#63) — will require disclosure |

**Deep link URL scheme:** `gitlist://`

| URL | Purpose |
|-----|---------|
| `gitlist://callback` | OAuth callback (GitHub via Supabase) |
| `gitlist://callback?code=<code>` | PKCE code exchange |
| `gitlist://callback#access_token=...` | Implicit OAuth hash flow |

---

## Pre-submission Checklist

Before submitting to App Store Review:

- [ ] Privacy policy published at `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- [ ] Terms of service published at `EXPO_PUBLIC_TERMS_URL`
- [ ] App privacy nutrition label completed in App Store Connect
- [ ] Age rating set to 4+
- [ ] RevenueCat project configured with live App Store product
- [ ] TestFlight internal build tested with sandbox purchase
- [ ] Screenshots captured (see ticket #64)
- [ ] App description reviewed for policy compliance (no misleading claims)
- [ ] Support URL and contact email set in App Store Connect
