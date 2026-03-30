---
description: Scaffold a new reusable React Native component
---

# New Component: $ARGUMENTS

## Process

### 1. Clarify before building
- What does this component render?
- What props does it accept? Any variants or sizes?
- Is it shared (→ `src/components/`) or screen-specific (→ alongside the screen)?
- Does a similar component already exist in `src/components/ui/` that should be extended?

### 2. Create the component

Follow the component anatomy in `docs/CONVENTIONS.md`:

```tsx
// src/components/[component-name].tsx

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, spacing, borderRadius } from '@trustdesign/shared/tokens'

interface [ComponentName]Props {
  // props here
  style?: StyleProp<ViewStyle>  // always include style prop
}

export function [ComponentName]({ style, ...props }: [ComponentName]Props) {
  return (
    <View style={[styles.container, style]}>
      {/* content */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // Use tokens — never raw numbers or hex strings
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
})
```

### 3. Variant support (if needed)

Use a variant prop and a lookup object — not cva (which is web-only):

```tsx
type Variant = 'primary' | 'secondary' | 'outline'

const VARIANT_STYLES: Record<Variant, { background: string; border?: string }> = {
  primary:   { background: colors.brand.primary },
  secondary: { background: colors.brand.secondary },
  outline:   { background: 'transparent', border: colors.brand.primary },
}
```

### 4. Platform conventions

Apply platform-appropriate styling where relevant:

```tsx
import { Platform, StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  card: {
    ...Platform.select({
      ios: {
        shadowColor: colors.surface.foreground,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
})
```

### 5. Accessibility
- Add `accessibilityRole` to interactive and semantic elements
- Add `accessibilityLabel` for elements without visible text labels
- Use `accessibilityState` for disabled, checked, selected, or busy states
- Ensure minimum touch target size of 44×44 pt for interactive elements
- Use `accessibilityLiveRegion="polite"` for dynamic content (e.g. error messages)

### 6. Design tokens only
- Import tokens from `src/lib/tokens.ts` if a brand has been applied with `/apply-brand`;
  otherwise import directly from `@trustdesign/shared/tokens`
- All colours → `colors.*`
- All spacing → `spacing[n]`
- All border radii → `borderRadius.*`
- All font sizes → `fontSize.*.*`
- No raw hex strings, no raw pixel values in StyleSheet

### 7. Write tests (requires Jest — see #4)
- Add `__tests__/[component-name].test.tsx` alongside the component
- Test: renders correctly, handles props/variants, handles edge cases
- Use React Native Testing Library (`@testing-library/react-native`)

### 8. Export from barrel
Add the new component to the relevant `index.ts` barrel file.
