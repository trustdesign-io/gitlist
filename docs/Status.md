# Gitlist — Status (31 March 2026)

## What's done

### Phase 1 — Complete & merged
All 6 Phase 1 tickets were completed by the CLI and merged:
- Scaffold from starter-native
- GitHub PAT authentication flow
- GitHub Projects v2 GraphQL API client
- Board list screen
- Task list screen
- Task detail screen

### GitHub-only auth (post Phase 1)
- Replaced email/Google sign-in with GitHub OAuth as the sole auth method
- Email auth disabled in Supabase dashboard
- GitHub OAuth App created under trustdesign-io org (Client ID: `Ov23liCZwmzQqy4ZLDTD`)

### Expo Go compatibility fixes
The starter-native template was designed for dev builds. We fixed all native module incompatibilities to run in Expo Go during development:
- MMKV → AsyncStorage (all cache/storage functions converted to async)
- react-native-reanimated v4 → v3 (v4 requires native worklets module)
- ReanimatedSwipeable → Swipeable from react-native-gesture-handler
- Sentry plugin removed, replaced with no-op stub at `src/lib/sentry.ts`
- babel-preset-expo added as direct dependency (fixed require path)
- `.npmrc` with `legacy-peer-deps=true`
- babel.config.js: `reanimated: false` to disable worklets plugin

### Auth flow fixes (this session)
- Installed `expo-web-browser`, rewrote `auth.ts` to use `WebBrowser.openAuthSessionAsync` instead of `Linking.openURL` (Safari couldn't redirect back to Expo Go)
- Updated `deep-links.ts` to capture `provider_token` from OAuth callback hash and store it via `storeGithubToken` (GitHub token was being discarded by `setSession`)
- Updated callback patterns from `starter-native://` to `gitlist://`
- Added redirect URLs in Supabase: `gitlist://callback` and `exp://**`

### starter-native template updates
All fixes applied back to the template so future projects don't hit the same issues:
- babel.config.js, package.json, app.json, sentry.ts stub, _layout.tsx, CLAUDE.md, .npmrc

### PLAN.md updated
- Architecture diagram references MMKV (needs updating to AsyncStorage for Expo Go phase)
- "Future" section included GitHub OAuth — now done

---

## What's in progress / next

### Phase 2 tickets — need to be created
These were written out but not yet given to the CLI:
1. Quick-add task bar
2. Swipe gestures (complete/delete)
3. Multi-board navigation
4. Field mapping (auto-detect custom fields)
5. Search and filter

### Known issues
- `_layout.tsx` — Sentry imports were reverted by the GitHub login ticket merge, then fixed again (now clean, exports `default RootLayout` without Sentry.wrap)
- PLAN.md architecture diagram still shows MMKV — should say AsyncStorage (for now; MMKV returns when we move to dev builds)
- The GitHub OAuth token may not persist across Supabase session refreshes — `TOKEN_REFRESHED` events won't include `provider_token`. This will need handling eventually (re-auth flow or long-lived token storage).

---

## Key references

| Item | Value |
|------|-------|
| Repo | trustdesign-io/gitlist |
| Local path | ~/Projects/trustdesign/gitlist |
| Supabase project ref | jhksmixuqpehchffapeh |
| Supabase org ID | tmukvgigbdtfbumhbfun |
| GitHub OAuth Client ID | Ov23liCZwmzQqy4ZLDTD |
| EAS project | gitlist |
| URL scheme | gitlist:// |
| Bundle ID | io.trustdesign.gitlist |

---

## Dev environment notes

- **Expo Go first**: All development currently uses Expo Go. No native modules allowed until we move to dev builds.
- **Xcode 16.2 + Expo SDK 55**: Local `npx expo run:ios` fails with Swift concurrency errors. Use EAS cloud builds or upgrade to Xcode 26+ when available.
- **npm**: Always use `--legacy-peer-deps` (configured in `.npmrc`)
- **Supabase CLI**: Installed via `brew install supabase/tap/supabase` (not npm)
- **Testing**: `npx expo start` → open in iOS Simulator via Expo Go
