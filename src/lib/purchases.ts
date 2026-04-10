/**
 * RevenueCat in-app purchases service - stubbed version.
 *
 * This module provides stub implementations for the RevenueCat SDK
 * (react-native-purchases). The native module is disabled for compilation.
 * All purchase functions are no-ops that simulate unavailable purchases.
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

/**
 * Stub type for PurchasesPackage - mimics the react-native-purchases API
 */
export interface PurchasesPackage {
  identifier: string
  packageType: string
  product: {
    identifier: string
    description: string
    title: string
    price: number
    priceString: string
    currencyCode: string
    currencySymbol: string
    introductoryPrice?: {
      price: number
      priceString: string
      period: string
      cycles: number
    }
    discounts?: Array<{
      identifier: string
      key: string
      price: number
      priceString: string
      period: string
      cycles: number
    }>
  }
}

/**
 * Stub type for PurchasesOffering - mimics the react-native-purchases API
 */
export interface PurchasesOffering {
  identifier: string
  serverDescription: string
  metadata: Record<string, unknown>
  availablePackages: PurchasesPackage[]
  lifetime: PurchasesPackage | null
  annual: PurchasesPackage | null
  sixMonth: PurchasesPackage | null
  threeMonth: PurchasesPackage | null
  oneMonth: PurchasesPackage | null
  twoMonth: PurchasesPackage | null
  weekly: PurchasesPackage | null
}

/**
 * Stub type for CustomerInfo - mimics the react-native-purchases API
 */
export interface CustomerInfo {
  originalAppUserId: string
  allExpirationDatesByProductId: Record<string, string | null>
  allPurchaseDatesByProductId: Record<string, string | null>
  allActiveShelves: Record<string, unknown>
  entitlements: {
    all: Record<string, { identifier: string; isActive: boolean; willRenew: boolean; billingIssueDetected: boolean; isSandbox: boolean; originalPurchaseDate: string | null; latestPurchaseDate: string | null; expirationDate: string | null }>
    active: Record<string, { identifier: string; isActive: boolean; willRenew: boolean; billingIssueDetected: boolean; isSandbox: boolean; originalPurchaseDate: string | null; latestPurchaseDate: string | null; expirationDate: string | null }>
  }
  firstSeen: string
  originalApplicationVersion: string | null
  latestApplicationVersion: string
  originalPurchaseDate: string | null
  requestDate: string
  allSubscriptionsStatus: Record<string, unknown>
  managementURL: string | null
  nonSubscriptionTransactions: Array<{
    transactionId: string
    productIdentifier: string
    purchaseDate: string
  }>
}

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT_ID = 'pro'

/**
 * Initialise the RevenueCat SDK.
 * Call this once at app startup (before any purchase or entitlement checks).
 * Safe to call multiple times — subsequent calls are no-ops.
 * (Stubbed - no-op)
 */
export function initPurchases(): void {
  if (__DEV__) {
    console.warn('[purchases] Purchases disabled - using stubbed implementation for compilation')
  }
}

/**
 * Fetch the current offerings from RevenueCat.
 * Returns null if the SDK is not configured or the fetch fails.
 * (Stubbed - always returns null)
 */
export async function fetchOfferings(): Promise<PurchasesOffering | null> {
  // No-op: return null to indicate purchases unavailable
  return null
}

/**
 * Check whether the current user has the "pro" entitlement.
 * Returns false if the SDK is not configured or the check fails.
 * (Stubbed - always returns false)
 */
export async function hasProEntitlement(): Promise<boolean> {
  // Stub: treat everyone as pro in development (RevenueCat removed)
  return true
}

/**
 * Purchase a package from the default offering.
 * Returns updated CustomerInfo on success, or throws on failure/cancellation.
 * (Stubbed - always throws error)
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo> {
  throw new Error('Purchases are not available - native module disabled for compilation')
}

/**
 * Restore previous purchases for the current App Store account.
 * Returns updated CustomerInfo.
 * (Stubbed - always throws error)
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  throw new Error('Purchases are not available - native module disabled for compilation')
}
