import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { colors, borderRadius, fontSize, spacing } from '@trustdesign/shared/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: string
  style?: StyleProp<ViewStyle>
}

const SPINNER_COLORS: Record<ButtonVariant, string> = {
  primary: colors.surface.background,
  secondary: colors.surface.background,
  outline: colors.brand.primary,
  destructive: colors.surface.background,
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLORS[variant]} size="small" />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
          {children}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // Variants
  primary: {
    backgroundColor: colors.brand.primary,
  },
  secondary: {
    backgroundColor: colors.brand.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
  },
  destructive: {
    backgroundColor: colors.semantic.error,
  },
  // Sizes
  size_sm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[8],
    minHeight: 56,
  },
  // States
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  // Labels
  label: {
    fontWeight: '600',
  },
  label_primary: {
    color: colors.surface.background,
  },
  label_secondary: {
    color: colors.surface.background,
  },
  label_outline: {
    color: colors.brand.primary,
  },
  label_destructive: {
    color: colors.surface.background,
  },
  labelSize_sm: {
    fontSize: fontSize.sm.size,
    lineHeight: fontSize.sm.lineHeight,
  },
  labelSize_md: {
    fontSize: fontSize.base.size,
    lineHeight: fontSize.base.lineHeight,
  },
  labelSize_lg: {
    fontSize: fontSize.lg.size,
    lineHeight: fontSize.lg.lineHeight,
  },
})
