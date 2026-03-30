import { colors } from '@trustdesign/shared/tokens'

export type ColorScheme = 'light' | 'dark' | 'system'

export interface Theme {
  colors: {
    // Brand (same in both modes)
    primary: string
    secondary: string
    accent: string
    // Semantic (same in both modes)
    success: string
    warning: string
    error: string
    info: string
    // Surface — vary by mode
    background: string
    foreground: string
    card: string
    cardForeground: string
    muted: string
    mutedForeground: string
    border: string
    input: string
    ring: string
    // Tab bar
    tabBackground: string
    tabBorder: string
  }
  isDark: boolean
}

export const lightTheme: Theme = {
  colors: {
    primary: colors.brand.primary,
    secondary: colors.brand.secondary,
    accent: colors.brand.accent,
    success: colors.semantic.success,
    warning: colors.semantic.warning,
    error: colors.semantic.error,
    info: colors.semantic.info,
    background: colors.surface.background,
    foreground: colors.surface.foreground,
    card: colors.surface.card,
    cardForeground: colors.surface.cardForeground,
    muted: colors.surface.muted,
    mutedForeground: colors.surface.mutedForeground,
    border: colors.surface.border,
    input: colors.surface.input,
    ring: colors.surface.ring,
    tabBackground: colors.surface.card,
    tabBorder: colors.surface.border,
  },
  isDark: false,
}

export const darkTheme: Theme = {
  colors: {
    primary: colors.brand.primary,
    secondary: colors.brand.secondary,
    accent: colors.brand.accent,
    success: colors.semantic.success,
    warning: colors.semantic.warning,
    error: colors.semantic.error,
    info: colors.semantic.info,
    background: colors.neutral[950],
    foreground: colors.neutral[50],
    card: colors.neutral[900],
    cardForeground: colors.neutral[50],
    muted: colors.neutral[800],
    mutedForeground: colors.neutral[400],
    border: colors.neutral[700],
    input: colors.neutral[700],
    ring: colors.brand.primary,
    tabBackground: colors.neutral[900],
    tabBorder: colors.neutral[700],
  },
  isDark: true,
}
