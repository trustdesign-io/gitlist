---
description: Scaffold a new screen in Expo Router
---

# New Screen: $ARGUMENTS

## Process

### 1. Determine the route
- Confirm the screen name and route path (e.g. `/(app)/orders/index.tsx`)
- Is this screen: public (`(auth)`), authenticated (`(app)`), or tab-level (`(app)/(tabs)`)?
- Does it need a stack layout or does it sit within an existing navigator?
- Is it accessed via tab bar, stack push, or modal?

### 2. Create the file structure

Following Expo Router conventions, screens live in `src/app/`:

```
src/app/(app)/
├── [feature]/
│   ├── _layout.tsx      # Stack layout (only if this section needs its own navigator)
│   └── index.tsx        # Main screen
│   └── [id].tsx         # Dynamic route (if needed)
```

For a new tab, add to `src/app/(app)/(tabs)/`:
```
src/app/(app)/(tabs)/
└── [screen-name].tsx    # New tab screen
```
Then register it in `src/app/(app)/(tabs)/_layout.tsx`.

### 3. Implement the screen

**Standard screen pattern:**
```tsx
import { View, Text, StyleSheet } from 'react-native'
import { colors, fontSize, spacing } from '@trustdesign/shared/tokens'

export default function [ScreenName]Screen() {
  return (
    <View style={styles.container}>
      {/* Screen content */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },
})
```

**For screens that fetch data:**
```tsx
import { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { colors } from '@trustdesign/shared/tokens'

type Data = { /* define your data shape */ }

export default function [ScreenName]Screen() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    )
  }

  return (/* ... */)
}
```

### 4. Navigation options

Set screen options (title, header buttons) in the layout or via `<Stack.Screen>` inside the component:

```tsx
import { Stack } from 'expo-router'

export default function MyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'My Screen' }} />
      {/* content */}
    </>
  )
}
```

For modal presentation:
```tsx
// In _layout.tsx
<Stack.Screen name="my-modal" options={{ presentation: 'modal' }} />
```

### 5. Link to the new screen
- Update navigation links or tab bar entries in `_layout.tsx` files
- Add a `Pressable` or `Link` component in the appropriate parent screen
- For deep linking, check that the path is registered in `app.json`

### 6. Accessibility
- Every `Pressable` / touchable has `accessibilityRole` and `accessibilityLabel`
- Screen heading uses an appropriate font size (at least `fontSize.xl`)
- Scrollable content uses `ScrollView` with `contentContainerStyle` padding

### 7. Verify
- `npm run type-check` (always available)
- `npm run lint` if ESLint is configured (see #3)
- Test on iOS and Android if using platform-specific APIs
- Verify navigation flow: can the user reach this screen and navigate away correctly?
