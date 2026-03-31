import { create } from 'zustand'

interface EntitlementState {
  /** Whether the user has the pro entitlement. null = not yet checked. */
  isPro: boolean | null
  isChecking: boolean
  setIsPro: (isPro: boolean) => void
  setChecking: (isChecking: boolean) => void
}

export const useEntitlementStore = create<EntitlementState>((set) => ({
  isPro: null,
  isChecking: false,
  setIsPro: (isPro) => set({ isPro }),
  setChecking: (isChecking) => set({ isChecking }),
}))
