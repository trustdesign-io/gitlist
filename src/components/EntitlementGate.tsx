import { type ReactNode, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useEntitlementStore } from '../stores/entitlement-store'

interface EntitlementGateProps {
  children: ReactNode
}

/**
 * Wraps screen content that requires the pro entitlement.
 * Redirects to the paywall when `isPro` is definitively false.
 * While the entitlement state is still loading (null), renders children
 * to avoid a flash — the check fires quickly enough from cache.
 */
export function EntitlementGate({ children }: EntitlementGateProps) {
  const isPro = useEntitlementStore((state) => state.isPro)
  const router = useRouter()

  useEffect(() => {
    if (isPro === false) {
      router.replace('/(app)/paywall')
    }
  }, [isPro, router])

  // Render children optimistically while entitlement is still being checked
  // (isPro === null). If isPro resolves to false, the useEffect above redirects.
  return <>{children}</>
}
