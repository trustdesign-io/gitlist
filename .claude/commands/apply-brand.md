---
description: Apply a client brand (colours, typography, design tokens) to the whole project
---

# Apply Brand: $ARGUMENTS

Apply a client brand to starter-native. This updates the shared design tokens, StyleSheet defaults,
and documents the brand system — replacing the Trust Design default palette.

---

## INPUTS — Gather before touching any files

Ask the user for all four before proceeding.

| # | Input | Example |
|---|-------|---------|
| 1 | **Brand name** (lowercase, no spaces) | `acme` |
| 2 | **Primary hex colour** | `#2563eb` |
| 3 | **Industry / product type** | `B2B SaaS`, `fintech`, `healthcare` |
| 4 | **3 words describing brand personality** | `trustworthy, modern, minimal` |

Do not proceed until all four are provided.

---

## Step 1 — Derive the colour system

Generate five complete colour scales programmatically from the primary hex.

### 1a — Shade generation

For each scale, given a base hex at shade 500, generate 11 shades (50–950):

**Lighter shades (50–400) — mix toward white:**

| Shade | White mix |
|-------|-----------|
| 50    | 95%       |
| 100   | 90%       |
| 200   | 75%       |
| 300   | 60%       |
| 400   | 40%       |

**Darker shades (600–950) — mix toward black:**

| Shade | Black mix |
|-------|-----------|
| 600   | 15%       |
| 700   | 30%       |
| 800   | 45%       |
| 900   | 60%       |
| 950   | 75%       |

Per-channel formula (R, G, B independently):
- Toward white: `result = round(channel + (255 - channel) * white_pct)`
- Toward black: `result = round(channel * (1 - black_pct))`

### 1b — Derive companion hues

Convert primary hex to HSL, then:
- **Secondary** — hue + 180° (complementary), saturation same, lightness 45%
- **Accent** — hue + 150°, saturation same, lightness 55%
- **Success** — fixed: HSL(142, 71%, 45%) ≈ `#16a34a`
- **Destructive** — fixed: HSL(0, 84%, 60%) ≈ `#ef4444`

---

## Step 2 — Update `src/lib/tokens.ts` (create if absent)

Create or update a local token override file at `src/lib/tokens.ts` that re-exports
from `@trustdesign/shared/tokens` but overrides the brand colours:

```ts
// src/lib/tokens.ts
// Brand: [brand-name]
// Override @trustdesign/shared/tokens with project-specific brand colours

export { spacing, borderRadius, fontSize } from '@trustdesign/shared/tokens'

export const colors = {
  brand: {
    primary:   '[primary-500-hex]',
    secondary: '[secondary-500-hex]',
    accent:    '[accent-500-hex]',
  },
  neutral: {
    50:  '[neutral-50]',
    // ... all 11 shades
    950: '[neutral-950]',
  },
  semantic: {
    success: '[success-500-hex]',
    warning: '#F59E0B',
    error:   '[destructive-500-hex]',
    info:    '#3B82F6',
  },
  surface: {
    background:     '#FFFFFF',
    foreground:     '[neutral-900]',
    card:           '#FFFFFF',
    cardForeground: '[neutral-900]',
    muted:          '[neutral-100]',
    mutedForeground:'[neutral-500]',
    border:         '[neutral-200]',
    input:          '[neutral-200]',
    ring:           '[primary-500-hex]',
  },
} as const
```

> **Note:** After adding `src/lib/tokens.ts`, update all imports in the project that use
> `@trustdesign/shared/tokens` to import from `../../lib/tokens` (or the correct relative path)
> instead. This ensures brand colours are applied everywhere.

---

## Step 3 — Update `app.json` with brand identity

Update the following fields in `app.json`:

```json
{
  "expo": {
    "name": "[Brand Name App Name]",
    "slug": "[brand-name]-app",
    "scheme": "[brand-name]",
    "ios": {
      "bundleIdentifier": "io.[brand-name].app"
    },
    "android": {
      "package": "io.[brand-name].app"
    }
  }
}
```

---

## Step 4 — Document in `docs/BRAND_GUIDE.md`

Create `docs/BRAND_GUIDE.md` with:

```md
# Brand Guide: [Brand Name]

## Identity
- **Brand name:** [brand-name]
- **Personality:** [3 words]
- **Industry:** [industry]

## Colour System

| Scale       | Base (500) | Usage |
|-------------|------------|-------|
| Primary     | [hex]      | Interactive elements, buttons, links |
| Secondary   | [hex]      | Supporting actions, badges |
| Accent      | [hex]      | Highlights, CTAs |
| Success     | [hex]      | Success states, confirmations |
| Destructive | [hex]      | Errors, destructive actions |

## Token overrides
All brand colour overrides live in `src/lib/tokens.ts`.
Import from there instead of `@trustdesign/shared/tokens` for brand-aware colours.

## Typography
[Add font choices and rationale here when decided]
```

---

## Step 5 — Verify and commit

```bash
npm run type-check
```

Fix any import path errors from the token override.

Then commit:
```bash
git add src/lib/tokens.ts app.json docs/BRAND_GUIDE.md
git commit -m "design: apply [brand-name] brand tokens"
```
