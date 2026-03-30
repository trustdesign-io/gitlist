import * as SecureStore from 'expo-secure-store'
import { supabase } from './supabase'
import type { ActionResult } from '@trustdesign/shared/types'

const secureKey = (userId: string) => `github_pat_${userId}`

export interface GithubAccount {
  githubUsername: string
  pat: string
}

/** Load PAT from SecureStore (fast path) then Supabase (fallback). */
export async function loadGithubPAT(userId: string): Promise<GithubAccount | null> {
  // Fast path: SecureStore
  try {
    const cached = await SecureStore.getItemAsync(secureKey(userId))
    if (cached) {
      const parsed = JSON.parse(cached) as GithubAccount
      return parsed
    }
  } catch {
    // SecureStore unavailable — fall through to Supabase
  }

  // Fallback: Supabase
  const { data, error } = await supabase
    .from('github_accounts')
    .select('github_username, github_pat')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  const account: GithubAccount = {
    githubUsername: data.github_username as string,
    pat: data.github_pat as string,
  }

  // Cache in SecureStore for future launches
  await SecureStore.setItemAsync(secureKey(userId), JSON.stringify(account)).catch(() => {})
  return account
}

/** Save a validated PAT to SecureStore and Supabase. */
export async function saveGithubPAT(
  userId: string,
  pat: string,
  githubUsername: string
): Promise<ActionResult> {
  const account: GithubAccount = { githubUsername, pat }

  // Upsert in Supabase
  const { error } = await supabase.from('github_accounts').upsert(
    {
      user_id: userId,
      github_username: githubUsername,
      github_pat: pat,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return { success: false, error: 'Failed to save token. Please try again.' }
  }

  // Cache in SecureStore
  await SecureStore.setItemAsync(secureKey(userId), JSON.stringify(account)).catch(() => {})
  return { success: true }
}

/** Remove PAT from SecureStore and Supabase. */
export async function removeGithubPAT(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(secureKey(userId)).catch(() => {})
  await supabase.from('github_accounts').delete().eq('user_id', userId)
}
