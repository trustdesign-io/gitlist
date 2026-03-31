import { useCallback, useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { hasProEntitlement } from '../lib/purchases'
import { useEntitlementStore } from '../stores/entitlement-store'

const CACHE_KEY = 'entitlement:isPro'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  isPro: boolean
  cachedAt: number
}

async function readCachedEntitlement(): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(CACHE_KEY)
      return null
    }
    return entry.isPro
  } catch {
    return null
  }
}

async function writeCachedEntitlement(isPro: boolean): Promise<void> {
  try {
    const entry: CacheEntry = { isPro, cachedAt: Date.now() }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // non-critical — ignore
  }
}

/**
 * Hook that checks the RevenueCat pro entitlement and keeps the store updated.
 * - On mount: loads cached value immediately (no flash), then fetches live
 * - On foreground: re-checks live entitlement
 *
 * Call this once in the root layout nav component.
 */
export function useEntitlementCheck(): void {
  const setIsPro = useEntitlementStore((state) => state.setIsPro)
  const setChecking = useEntitlementStore((state) => state.setChecking)
  const hasLoadedRef = useRef(false)

  const checkEntitlement = useCallback(
    async (useCache: boolean) => {
      if (useCache) {
        // Apply cached value first so there's no flash for paid users
        const cached = await readCachedEntitlement()
        if (cached !== null) {
          setIsPro(cached)
          return
        }
      }

      setChecking(true)
      try {
        const isPro = await hasProEntitlement()
        setIsPro(isPro)
        await writeCachedEntitlement(isPro)
      } catch {
        // On error, default to not-pro only if we have no prior state
        if (useEntitlementStore.getState().isPro === null) {
          setIsPro(false)
        }
      } finally {
        setChecking(false)
      }
    },
    [setIsPro, setChecking]
  )

  // Initial check: use cache first for instant response
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    void checkEntitlement(true)
    // Follow up with a live check after a short delay to ensure freshness
    const timeout = setTimeout(() => {
      void checkEntitlement(false)
    }, 2000)
    return () => clearTimeout(timeout)
  }, [checkEntitlement])

  // Re-check on foreground
  useEffect(() => {
    function handleAppState(nextState: AppStateStatus) {
      if (nextState === 'active') {
        void checkEntitlement(false)
      }
    }
    const sub = AppState.addEventListener('change', handleAppState)
    return () => sub.remove()
  }, [checkEntitlement])
}
