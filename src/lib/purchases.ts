/**
 * RevenueCat in-app purchases service.
 *
 * This module wraps react-native-purchases (RevenueCat SDK) for the Gitlist
 * one-time purchase flow. It requires a **dev build** — it will not work in
 * Expo Go because react-native-purchases contains native code.
 *
 * Setup checklist (outside the codebase):
 *  1. Create a RevenueCat project at app.revenuecat.com
 *  2. Add the iOS App Store app (Bundle ID: see app.json)
 *  3. Create a product in App Store Connect (consumable → non-consumable,
 *     one-time purchase) and link it in RevenueCat → Products
 *  4. Create an Entitlement named "pro" and attach the product to it
 *  5. Create an Offering (id: "default") containing a Package with the product
 *  6. Copy the RevenueCat iOS Public API Key and set it as
 *     EXPO_PUBLIC_REVENUECAT_IOS_KEY in your .env file
 */

import Purchases, {
  type PurchasesOffering,
  type CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases'
import { Platform } from 'react-native'

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT_ID = 'pro'

/**
 * Initialise the RevenueCat SDK.
 * Call this once at app startup (before any purchase or entitlement checks).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initPurchases(): void {
  if (Platform.OS !== 'ios') return
  if (!IOS_API_KEY) {
    // Key not set — purchases unavailable. This is expected in local dev
    // before the RevenueCat project is configured.
    if (__DEV__) {
      console.warn('[purchases] EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set — purchases disabled')
    }
    return
  }
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  }
  Purchases.configure({ apiKey: IOS_API_KEY })
}

/**
 * Fetch the current offerings from RevenueCat.
 * Returns null if the SDK is not configured or the fetch fails.
 */
export async function fetchOfferings(): Promise<PurchasesOffering | null> {
  if (!IOS_API_KEY) return null
  try {
    const offerings = await Purchases.getOfferings()
    return offerings.current ?? null
  } catch (err) {
    if (__DEV__) {
      console.warn('[purchases] fetchOfferings failed:', err)
    }
    return null
  }
}

/**
 * Check whether the current user has the "pro" entitlement.
 * Returns false if the SDK is not configured or the check fails.
 */
export async function hasProEntitlement(): Promise<boolean> {
  if (!IOS_API_KEY) return false
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo()
    return info.entitlements.active[PRO_ENTITLEMENT_ID] != null
  } catch {
    return false
  }
}

/**
 * Purchase a package from the default offering.
 * Returns updated CustomerInfo on success, or throws on failure/cancellation.
 */
export async function purchasePackage(
  pkg: Parameters<typeof Purchases.purchasePackage>[0]
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg)
  return customerInfo
}

/**
 * Restore previous purchases for the current App Store account.
 * Returns updated CustomerInfo.
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases()
}
