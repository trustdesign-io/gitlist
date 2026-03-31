# App Store Listing

Approved copy for the Gitlist App Store submission.

**Bundle ID:** `io.trustdesign.gitlist`
**Category:** Productivity
**Age Rating:** 4+

---

## App Name

**Gitlist**

---

## Subtitle (30 chars max)

> GitHub boards, beautifully

_(27 characters)_

---

## Description

Your GitHub Projects boards, in your pocket.

Gitlist connects directly to your GitHub Projects v2 boards and brings your issues, pull requests, and tasks into a clean, native iOS experience — without the noise of the full GitHub interface.

**Your boards, your way**
See every project board at a glance. Tap into any board to see tasks by column, filter by status, and navigate between items with a swipe.

**Due today, at a glance**
The Today tab surfaces everything due today across all your boards — so you know exactly what to focus on each morning.

**Works the way you do**
Swipe to mark tasks done or delete them. Pull to refresh. Works offline with cached data.

---

## Keywords (100 chars max)

> github,projects,issues,tasks,boards,productivity,developer,pull request,agile,kanban

_(88 characters)_

---

## Support URL

Set `EXPO_PUBLIC_SUPPORT_URL` or use a placeholder until the support page is live.

Suggested: `https://trustdesign.io/support`

---

## Screenshot guidance

### Required sizes

| Device | Points | Notes |
|--------|--------|-------|
| iPhone 16 Pro Max | 6.9" | Required from 2024 |
| iPhone 14 Plus | 6.5" | Legacy requirement |
| iPad Pro 12.9" | 12.9" | Required if `supportsTablet: true` |

### Recommended screens to capture (5 screenshots per size)

1. **Boards list** — showing 2–3 real-looking boards with item counts and "Updated today" timestamps
2. **Board detail** — task list with column headers, showing a mix of open and completed items
3. **Today tab** — showing 3–5 tasks due today across 2 boards
4. **Task detail** — showing a task with status badge, description, and prev/next navigation
5. **Settings** — showing appearance picker, GitHub connection badge, version number

### Capture instructions

1. Build preview build: `eas build --profile preview --platform ios`
2. Install on device or simulator
3. Use iPhone 16 Pro Max simulator for 6.9" screenshots
4. Use iPhone 14 Plus simulator for 6.5" screenshots
5. Use iPad Pro 12.9" simulator for iPad screenshots
6. Capture via `Cmd+S` in Xcode Simulator (saves to Desktop)
7. Optional: add a device frame using Rottenwood, AppMockUp, or Figma

### Caption suggestions (optional overlay text)

1. "All your GitHub boards in one place"
2. "Navigate tasks with a swipe"
3. "Everything due today, at a glance"
4. "Deep dive into any task"
5. "Your app, your look"

---

## App icon

**Source file:** `assets/icon.png` (already referenced in `app.json`)

**Requirements:**
- 1024×1024 px, PNG, no alpha channel
- No rounded corners — App Store applies the squircle mask
- EAS Build generates all required sizes from the 1024×1024 source

**Concept:** The current icon uses the default Expo icon. Replace with a Gitlist-branded icon:
- Blue (#2563EB) background matching splash screen
- White git-branch or checklist glyph centred on the icon

---

## Age rating questionnaire

All answers: **No / None** — Gitlist is a developer productivity tool with no user-generated public content.

| Question | Answer |
|----------|--------|
| Made for Kids | No |
| Cartoon/Fantasy violence | None |
| Realistic violence | None |
| Sexual/mature content | None |
| Profanity/crude humour | None |
| Medical/treatment info | None |
| Alcohol, tobacco, drugs | None |
| Gambling | None |
| Horror/fear themes | None |
| Prolonged graphic violence | None |
| Graphic sexual content | None |
| Nudity | None |

**Result:** 4+
