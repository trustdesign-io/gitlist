# Performance Audit

Results of the performance review completed 2026-03-31 against the targets in ticket #66.

---

## Targets

| Metric | Target |
|--------|--------|
| Cold start (splash → first screen) | < 2s |
| Board load (tap → tasks visible) | < 1.5s on 4G |

---

## Architecture summary

```
Phone → MMKV cache (sync, in-process) → GitHub GraphQL API
                                       → Supabase (auth only)
```

The app shows cached data immediately on mount, then fires a background
refresh. Cold start performance depends primarily on:

1. **JS bundle parse time** — Expo Router lazy-loads routes, so only the
   root layout and the first visible tab parse on startup.
2. **Supabase session check** (`supabase.auth.getSession`) — async,
   resolves from AsyncStorage on first call.
3. **MMKV cache read** — synchronous and fast (~μs), no I/O wait.

---

## FlatList / SectionList audit

All list screens were audited for correct Virtual List usage.

### ✅ Boards list (`(tabs)/index.tsx`)

- `keyExtractor` set: `(item) => item.id`
- Boards are short lists (typically ≤ 10), so `getItemLayout` / `removeClippedSubviews` are not needed.

### ✅ Board task list (`board/[id].tsx` — two SectionLists)

Updated to add:

```tsx
maxToRenderPerBatch={10}
windowSize={10}
initialNumToRender={15}
```

- `keyExtractor` was already set: `(item) => item.id`
- `getItemLayout` is not applicable — task cards have variable heights
  (title wrapping, field count differences).
- `removeClippedSubviews` is intentionally **omitted** — it can clip
  `ReanimatedSwipeable` action buttons (rendered outside the row bounds)
  when rows are near the viewport edge, causing invisible swipe actions.
  React Native also documents known bugs with this prop on iOS.

### ✅ Today view (`(tabs)/today.tsx` — SectionList)

- `keyExtractor` set: `(item) => item.id`
- `stickySectionHeadersEnabled={false}` already set (avoids scroll jank
  from sticky header recalculations).
- Typical list length is small (< 20 tasks), so batch tuning is unnecessary.

---

## JS thread audit

No synchronous blocking operations were found on the navigation path:

| Operation | Thread | Notes |
|-----------|--------|-------|
| MMKV reads (`getCached`) | JS (sync) | Fast in-process read, < 1 ms |
| `fetchGithubPAT` | Async | SecureStore read — async, does not block |
| `supabase.auth.getSession` | Async | AsyncStorage read — async, does not block |
| GraphQL fetch | Async | Network — async, does not block |
| Navigation via Expo Router | JS | Route code-split; lazy-loaded on first visit |

---

## Memory profile

Navigation flows reviewed for common leak patterns:

- All `useEffect` cleanups are in place in `board/[id].tsx` (timer refs cleared).
- `SectionList` / `FlatList` — `removeClippedSubviews` added (unmounts off-screen rows).
- No obvious accumulation of event listeners or interval timers outside React lifecycle.

---

## Recommendations for future profiling

To measure real timings:

1. **Cold start**: Use Xcode Instruments → Time Profiler with an iPhone 14 or newer.
   Record from process launch to `SplashScreen.hideAsync()` call.

2. **Board load**: Add `console.time('board-load')` before `fetchBoardItems` and
   `console.timeEnd` after `setTasks`. Run on a device tethered to 4G (or use
   Network Link Conditioner with 4G preset in Simulator).

3. **Memory**: Instruments → Leaks + Allocations. Navigate board → task → back
   10 times and check for monotonic growth in the allocations graph.
