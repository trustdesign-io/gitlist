---
description: Pre-PR code review against project standards
---

# Code Review

Review the current changes (or $ARGUMENTS if a specific file/area is specified) against the project's standards.

## Review Checklist

### Correctness
- [ ] Does the code do what it's supposed to do?
- [ ] Are edge cases handled (null/undefined values, empty lists, network failures)?
- [ ] Is error handling complete and user-friendly (Alert or inline error state)?
- [ ] Are loading states shown while async operations run?

### Conventions (`docs/CONVENTIONS.md`)
- [ ] Component structure follows the project pattern
- [ ] Naming conventions are consistent (PascalCase components, camelCase functions)
- [ ] No `any` types — full TypeScript coverage
- [ ] Functional components only — no class components
- [ ] `StyleSheet.create()` used for all styles — no inline style objects
- [ ] All style values use design tokens from `@trustdesign/shared/tokens` — no raw hex or magic numbers
- [ ] Imports ordered: React → RN → Expo → internal lib → components → types

### React Native patterns
- [ ] No DOM APIs (`document`, `window`, `localStorage`) — use RN/Expo equivalents
- [ ] Platform-specific code uses `Platform.select()` or `.ios.tsx`/`.android.tsx` file suffixes
- [ ] `FlatList` or `SectionList` used for long lists — not `ScrollView` with `.map()`
- [ ] `KeyboardAvoidingView` wraps forms that include text inputs
- [ ] Images use `expo-image` or `<Image>` with explicit dimensions
- [ ] Touch targets are at least 44×44 pt (check `minHeight`/`minWidth` or padding)
- [ ] No `TouchableOpacity` — use `Pressable` throughout

### Expo Router / Navigation
- [ ] Route files export a single default component
- [ ] `useRouter()` used for imperative navigation — not manual href strings where router hooks apply
- [ ] Deep link paths registered in `app.json` if new routes are added
- [ ] Auth guard in root `_layout.tsx` still applies correctly to new routes

### Accessibility
- [ ] Interactive elements (`Pressable`, custom buttons) have `accessibilityRole`
- [ ] Elements without visible text have `accessibilityLabel`
- [ ] `accessibilityState` set for disabled, checked, or selected elements
- [ ] Dynamic content (errors, toasts) uses `accessibilityLiveRegion="polite"`
- [ ] Screen reader order is logical (avoid `zIndex` tricks that reorder content visually)

### Security
- [ ] User input is validated with Zod before use
- [ ] Supabase queries use RLS — no admin client exposed to the client
- [ ] Sensitive values (API keys, tokens) stored in `.env` / `expo-secure-store` — not hardcoded
- [ ] No `eval()` or dynamic code execution

### Performance
- [ ] `useCallback` / `useMemo` used only where genuinely needed (not prematurely)
- [ ] Heavy lists use `FlatList` with `keyExtractor` and `getItemLayout` if possible
- [ ] No synchronous calls in render — async work in `useEffect` or event handlers
- [ ] No re-renders caused by new object/array references in props

### Tests
- [ ] Unit tests for new lib functions
- [ ] Component tests for interactive UI
- [ ] Existing tests still pass: `npm run test`

### Build
- [ ] `npm run type-check` passes (always required)
- [ ] `npm run lint` passes (requires ESLint — see #3)
- [ ] `npm run test` passes (requires Jest — see #4)

## Output Format

For each issue found, state:
1. **Severity:** 🔴 Blocker / 🟡 Warning / 🟢 Suggestion
2. **File and line**
3. **Issue description**
4. **Suggested fix**

Then provide an overall assessment: **Ready to merge** / **Needs changes**.
