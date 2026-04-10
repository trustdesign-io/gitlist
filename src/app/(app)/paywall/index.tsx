import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { colors, fontSize, spacing, borderRadius } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'
import {
  fetchOfferings,
  purchasePackage,
  restorePurchases,
  PRO_ENTITLEMENT_ID,
  type PurchasesPackage,
} from '../../../lib/purchases'
import { captureEvent } from '../../../lib/analytics'

// ---------------------------------------------------------------------------
// Feature list
// ---------------------------------------------------------------------------

const FEATURES = [
  'All your GitHub Projects boards in one place',
  'Task detail with full field editing',
  'Today view — tasks due across all boards',
  'Prev/next navigation between tasks',
  'One-time purchase — no subscription',
]

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'ready'; pkg: PurchasesPackage | null }
  | { kind: 'purchasing' }
  | { kind: 'restoring' }
  | { kind: 'error'; message: string }
  | { kind: 'success' }

export default function PaywallScreen() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [state, setState] = useState<ScreenState>({ kind: 'loading' })

  const s = useMemo(() => styles(theme, insets), [theme, insets])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const offering = await fetchOfferings()
      if (cancelled) return
      const pkg = offering?.availablePackages[0] ?? null
      setState({ kind: 'ready', pkg })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handlePurchase = useCallback(async () => {
    if (state.kind !== 'ready' || !state.pkg) return
    captureEvent('purchase_started')
    setState({ kind: 'purchasing' })
    try {
      const info = await purchasePackage(state.pkg)
      if (info.entitlements.active[PRO_ENTITLEMENT_ID] != null) {
        captureEvent('purchase_completed')
        setState({ kind: 'success' })
        // Give the user a moment to see the confirmation before dismissing
        setTimeout(() => {
          if (router.canGoBack()) {
            router.back()
          } else {
            router.replace('/(app)/(tabs)')
          }
        }, 800)
      } else {
        setState({
          kind: 'error',
          message: 'Purchase completed but entitlement was not activated. Please restore purchases.',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // PurchasesErrorCode.purchaseCancelledError — user cancelled, don't show error
      if (message.includes('userCancelled') || message.includes('1')) {
        setState({ kind: 'ready', pkg: state.pkg })
        return
      }
      setState({
        kind: 'error',
        message: 'Purchase could not be completed. Please try again.',
      })
    }
  }, [state, router])

  const handleRestore = useCallback(async () => {
    setState({ kind: 'restoring' })
    try {
      const info = await restorePurchases()
      if (info.entitlements.active[PRO_ENTITLEMENT_ID] != null) {
        setState({ kind: 'success' })
        setTimeout(() => {
          if (router.canGoBack()) {
            router.back()
          } else {
            router.replace('/(app)/(tabs)')
          }
        }, 800)
      } else {
        setState({
          kind: 'error',
          message: 'No previous purchase found for this Apple ID.',
        })
      }
    } catch {
      setState({
        kind: 'error',
        message: 'Restore failed. Check your internet connection and try again.',
      })
    }
  }, [router])

  const handleRetry = useCallback(() => {
    setState({ kind: 'loading' })
    void (async () => {
      const offering = await fetchOfferings()
      const pkg = offering?.availablePackages[0] ?? null
      setState({ kind: 'ready', pkg })
    })()
  }, [])

  const isBusy = state.kind === 'purchasing' || state.kind === 'restoring' || state.kind === 'loading'
  const pkg = state.kind === 'ready' ? state.pkg : null

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      bounces={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.iconWrap}>
          <Ionicons name="git-branch-outline" size={36} color={theme.colors.primary} />
        </View>
        <Text style={s.appName}>Gitlist</Text>
        <Text style={s.tagline}>GitHub Projects — in your pocket.</Text>
      </View>

      {/* Feature list */}
      <View style={s.features}>
        {FEATURES.map((feature) => (
          <View key={feature} style={s.featureRow}>
            <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
            <Text style={s.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Success state */}
      {state.kind === 'success' && (
        <View style={s.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color={colors.semantic.success} />
          <Text style={s.successText}>Purchase complete.</Text>
        </View>
      )}

      {/* Error state */}
      {state.kind === 'error' && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{state.message}</Text>
          <Pressable
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={s.errorRetry}>Try again</Text>
          </Pressable>
        </View>
      )}

      {/* Price + CTA */}
      <View style={s.cta}>
        {state.kind === 'loading' ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            <Pressable
              style={[s.purchaseButton, isBusy && s.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={isBusy || !pkg}
              accessibilityRole="button"
              accessibilityLabel={
                pkg
                  ? `Buy Gitlist for ${pkg.product.priceString}`
                  : 'Purchase unavailable'
              }
            >
              {state.kind === 'purchasing' ? (
                <ActivityIndicator color={colors.surface.background} />
              ) : (
                <Text style={s.purchaseLabel}>
                  {pkg != null
                    ? `Get Gitlist — ${pkg.product.priceString}`
                    : 'Purchase unavailable'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleRestore}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Restore previous purchase"
              style={s.restoreButton}
            >
              {state.kind === 'restoring' ? (
                <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
              ) : (
                <Text style={[s.restoreLabel, isBusy && s.restoreLabelDisabled]}>
                  Restore purchase
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      {/* Legal */}
      <Text style={s.legal}>
        One-time purchase. Payment processed by Apple. No subscription or recurring charges.
      </Text>
    </ScrollView>
  )
}

function styles(
  theme: ReturnType<typeof useTheme>['theme'],
  insets: { top: number; bottom: number }
) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingTop: insets.top + spacing[8],
      paddingBottom: insets.bottom + spacing[6],
      paddingHorizontal: spacing[6],
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing[10],
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: borderRadius['2xl'],
      backgroundColor: theme.colors.primary + '1a',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing[4],
    },
    appName: {
      fontSize: fontSize['3xl'].size,
      lineHeight: fontSize['3xl'].lineHeight,
      fontWeight: '700',
      color: theme.colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      marginTop: spacing[2],
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
    },
    features: {
      gap: spacing[4],
      marginBottom: spacing[10],
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
    },
    featureText: {
      flex: 1,
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.foreground,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      backgroundColor: colors.semantic.success + '1a',
      borderRadius: borderRadius.lg,
      padding: spacing[4],
      marginBottom: spacing[4],
    },
    successText: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: colors.semantic.success,
      fontWeight: '600',
    },
    errorBanner: {
      backgroundColor: theme.colors.error + '1a',
      borderRadius: borderRadius.lg,
      padding: spacing[4],
      marginBottom: spacing[4],
      gap: spacing[2],
    },
    errorText: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.error,
    },
    errorRetry: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    cta: {
      gap: spacing[3],
      marginBottom: spacing[6],
    },
    purchaseButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius['2xl'],
      paddingVertical: spacing[4],
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    purchaseButtonDisabled: {
      opacity: 0.5,
    },
    purchaseLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '700',
      color: colors.surface.background,
      letterSpacing: -0.2,
    },
    restoreButton: {
      alignItems: 'center',
      paddingVertical: spacing[2],
      minHeight: 44,
      justifyContent: 'center',
    },
    restoreLabel: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
    },
    restoreLabelDisabled: {
      opacity: 0.4,
    },
    legal: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
    },
  })
}
