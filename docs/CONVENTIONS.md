# Coding Conventions

This document is the authoritative reference for how code is written in this project.
Follow it consistently — Claude will use this file when generating or reviewing code.

## Component Anatomy

Every React Native component follows this order:

```tsx
// 1. React
import { useCallback, useState } from 'react'

// 2. React Native primitives
import { Pressable, StyleSheet, Text, View } from 'react-native'

// 3. Expo / third-party packages
import { useRouter } from 'expo-router'

// 4. Internal — lib, stores, hooks
import { signOut } from '../../lib/auth'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrentUser } from '../../hooks/use-current-user'

// 5. Internal — components
import { Button } from '../../components/ui/Button'

// 6. Design tokens
import { colors, fontSize, spacing } from '@trustdesign/shared/tokens'

// 7. Types (type-only imports last)
import type { User } from '@trustdesign/shared/types'

// 8. Local types
interface ProfileCardProps {
  user: User
  style?: StyleProp<ViewStyle>
}

// 9. Component (named export)
export function ProfileCard({ user, style }: ProfileCardProps) {
  // a. Hooks first
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)

  // b. Derived state / computations
  const initials = user.name?.charAt(0).toUpperCase() ?? '?'

  // c. Handlers
  function handlePress() {
    router.push('/(app)/profile')
  }

  // d. Render
  return (
    <Pressable
      style={[styles.container, style]}
      onPress={handlePress}
      accessibilityRole="button"
    >
      <Text style={styles.initials}>{initials}</Text>
    </Pressable>
  )
}

// 10. StyleSheet (always at the bottom, after the component)
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.brand.primary,
    borderRadius: spacing[8],
    padding: spacing[4],
  },
  initials: {
    color: colors.surface.background,
    fontSize: fontSize.lg.size,
    fontWeight: '600',
  },
})

// 11. Helper functions (module-level, below the component)
function formatDisplayName(user: User): string {
  return user.name ?? user.email ?? 'Unknown'
}
```

## TypeScript Rules

```ts
// ❌ Never use `any`
function process(data: any) {}

// ✅ Use unknown for truly unknown types, then narrow
function process(data: unknown) {
  if (typeof data === 'string') { /* ... */ }
}

// ❌ Don't type-cast without a good reason
const user = data as User

// ✅ Validate and narrow instead (use Zod)
const user = UserSchema.parse(data)

// ✅ Use satisfies for config objects
const config = { theme: 'dark' } satisfies AppConfig
```

## StyleSheet Patterns

```ts
// ✅ Always use StyleSheet.create() — never inline style objects
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.muted, // ✅ token
    padding: spacing[4],                   // ✅ token
    borderRadius: borderRadius.xl,         // ✅ token
  },
})

// ❌ No raw hex strings
backgroundColor: '#F9FAFB'

// ❌ No magic pixel values
padding: 16

// ✅ Use token values
backgroundColor: colors.surface.muted
padding: spacing[4]

// ✅ Platform-specific shadows always via Platform.select
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
})
```

## Lib Functions (Data Layer)

All Supabase calls and data operations live in `src/lib/`. Return `ActionResult` for
mutations, raw data or `null` for queries.

```ts
// src/lib/auth.ts
import type { ActionResult } from '@trustdesign/shared/types'
import { supabase } from './supabase'

export async function signInWithEmail(
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch {
    return { success: false, error: 'An unexpected error occurred.' }
  }
}
```

## Error Handling

```ts
// Lib functions: always return ActionResult — never throw to screens
// Screens: show Alert or inline error state — never raw error strings

// ✅ Screen error handling pattern
async function handleSubmit() {
  setIsLoading(true)
  const result = await doSomething(input)
  setIsLoading(false)
  if (!result.success) {
    Alert.alert('Error', result.error)
    // or: setError(result.error) for inline display
  }
}
```

## Zustand Stores

```ts
// src/stores/my-store.ts
import { create } from 'zustand'
import type { User } from '@trustdesign/shared/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
}))
```

Use selectors to prevent unnecessary re-renders:

```ts
// ✅ Select only what you need
const user = useAuthStore((state) => state.user)

// ❌ Don't subscribe to the whole store
const store = useAuthStore()
```

## Platform Conventions

```ts
// Conditional rendering by platform
import { Platform } from 'react-native'

const title = Platform.OS === 'ios' ? 'Done' : 'Confirm'

// Platform-specific files (preferred for larger differences)
// Button.ios.tsx   — iOS implementation
// Button.tsx       — default (Android + web) implementation
```

## Accessibility

Every interactive element must have:

```tsx
<Pressable
  onPress={handlePress}
  accessibilityRole="button"                // what it is
  accessibilityLabel="Open user menu"       // what it does (if no visible text)
  accessibilityState={{ disabled: !canPress }}
>
```

Use `accessibilityLiveRegion="polite"` on elements that update dynamically (error
messages, status text):

```tsx
{error ? (
  <Text style={styles.error} accessibilityLiveRegion="polite">
    {error}
  </Text>
) : null}
```

Touch targets must be at least 44×44 pt. Use `minHeight`/`minWidth` or padding to
guarantee this on small icons.

## Navigation Patterns

```tsx
// Stack push
router.push('/(app)/profile')

// Replace (no back button)
router.replace('/(app)/(tabs)')

// Modal
// In _layout.tsx: <Stack.Screen name="modal" options={{ presentation: 'modal' }} />

// Dynamic route
router.push(`/(app)/items/${item.id}`)
```

Always use typed routes (enabled via `experiments.typedRoutes: true` in `app.json`).

## File Organisation

- One component per file
- Keep files under 300 lines — split into subcomponents if larger
- `src/components/ui/` — generic, reusable primitives (Button, Card, TextInput…)
- `src/components/` — app-specific shared components (AuthProvider, ErrorBoundary…)
- `src/app/` — screens and layouts only — no business logic
- `src/lib/` — all data access and side-effect functions
- `src/stores/` — Zustand stores
- `src/hooks/` — custom hooks
- `src/types/` — shared type re-exports

## Testing

Requires Jest + React Native Testing Library (set up in ticket #4).

```ts
// Unit tests: co-located or in __tests__/
// src/lib/__tests__/auth.test.ts
import { signInWithEmail } from '../auth'

// Jest globals (describe, it, expect, jest) are available without imports
jest.mock('../supabase', () => ({ /* stub */ }))

describe('signInWithEmail', () => {
  it('returns success: false on Supabase error', async () => {
    const result = await signInWithEmail('bad@email.com', 'wrong')
    expect(result.success).toBe(false)
  })
})

// Component tests: React Native Testing Library
// src/components/ui/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '../Button'

it('calls onPress when tapped', () => {
  const onPress = jest.fn()
  const { getByText } = render(<Button onPress={onPress}>Tap me</Button>)
  fireEvent.press(getByText('Tap me'))
  expect(onPress).toHaveBeenCalledTimes(1)
})
```
