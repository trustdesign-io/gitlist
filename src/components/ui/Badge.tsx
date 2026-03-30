import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, borderRadius, fontSize, spacing } from '@trustdesign/shared/tokens'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  style?: StyleProp<ViewStyle>
}

// 15% opacity tint backgrounds using semantic tokens; text uses neutral[800] for contrast
const VARIANT_COLORS: Record<BadgeVariant, { background: string; text: string }> = {
  default: { background: colors.neutral[200], text: colors.neutral[700] },
  success: { background: colors.semantic.success + '26', text: colors.neutral[800] },
  warning: { background: colors.semantic.warning + '26', text: colors.neutral[800] },
  error: { background: colors.semantic.error + '26', text: colors.neutral[800] },
  info: { background: colors.semantic.info + '26', text: colors.neutral[800] },
  secondary: { background: colors.brand.secondary + '26', text: colors.brand.secondary },
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const { background, text } = VARIANT_COLORS[variant]

  return (
    <View style={[styles.container, { backgroundColor: background }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[0.5],
  },
  label: {
    fontSize: fontSize.xs.size,
    lineHeight: fontSize.xs.lineHeight,
    fontWeight: '600',
  },
})
