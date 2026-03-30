import { View, Text, StyleSheet, Platform } from 'react-native'

// Build-time constant — EXPO_PUBLIC_* vars are inlined at bundle time, never updated at runtime
const VARIANT = process.env.EXPO_PUBLIC_APP_VARIANT

const LABEL: Record<string, string> = {
  development: 'DEV',
  staging: 'STAGING',
}

// Approximate safe-area top offset per platform — good enough for a dev overlay
const TOP_OFFSET = Platform.OS === 'ios' ? 52 : 28

export function EnvironmentBadge() {
  const label = VARIANT ? LABEL[VARIANT] : undefined

  if (!label) return null

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: TOP_OFFSET,
    right: 12,
    zIndex: 9999,
    backgroundColor: VARIANT === 'staging' ? '#F59E0B' : '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    pointerEvents: 'none',
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
