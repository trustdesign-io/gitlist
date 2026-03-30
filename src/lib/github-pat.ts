import * as SecureStore from 'expo-secure-store'
import { supabase } from './supabase'
import type { ActionResult } from '@trustdesign/shared/types'

/**
 * SecureStore key for the cached GitHub username (not the PAT itself).
 * The PAT is fetched from Supabase via RPC (where it is stored encrypted).
 * Caching the username avoids a network call on every cold start.
 */
const usernameKey = (userId: string) => `github_username_${userId}`

/** Lightweight struct for boot-time state hydration. */
export interface GithubAccountMeta {
  githubUsername: string
}

/**
 * Load the GitHub username from SecureStore (fast path) or Supabase (fallback).
 * Only returns the username — use `fetchGithubPAT` when the token is needed.
 */
export async function loadGithubAccountMeta(userId: string): Promise<GithubAccountMeta | null> {
  // Fast path: SecureStore (no network)
  try {
    const cached = await SecureStore.getItemAsync(usernameKey(userId))
    if (cached) return { githubUsername: cached }
  } catch {
    // SecureStore unavailable — fall through
  }

  // Fallback: Supabase (decrypts PAT via RPC, but we only need the username here)
  const { data, error } = await supabase.rpc('get_github_pat')
  if (error || !data || data.length === 0) return null

  const row = data[0] as { github_username: string }
  await SecureStore.setItemAsync(usernameKey(userId), row.github_username).catch(() => {})
  return { githubUsername: row.github_username }
}

/**
 * Fetch the decrypted PAT from Supabase.
 * Called only when a GitHub API request is about to be made.
 */
export async function fetchGithubPAT(userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_github_pat')
  if (error || !data || data.length === 0) return null
  const row = data[0] as { github_pat: string }

  // Refresh the username cache while we're here
  const usernameRow = data[0] as { github_username: string }
  await SecureStore.setItemAsync(usernameKey(userId), usernameRow.github_username).catch(() => {})

  return row.github_pat
}

/** Save a validated PAT — encrypted via Supabase RPC, username cached in SecureStore. */
export async function saveGithubPAT(
  userId: string,
  pat: string,
  githubUsername: string
): Promise<ActionResult> {
  const { error } = await supabase.rpc('store_github_pat', {
    p_username: githubUsername,
    p_pat: pat,
  })

  if (error) {
    return { success: false, error: 'Failed to save token. Please try again.' }
  }

  await SecureStore.setItemAsync(usernameKey(userId), githubUsername).catch(() => {})
  return { success: true }
}

/** Remove the PAT from Supabase and SecureStore. */
export async function removeGithubPAT(userId: string): Promise<ActionResult> {
  const { error } = await supabase.rpc('delete_github_pat')
  if (error) {
    return { success: false, error: 'Failed to unlink GitHub account. Please try again.' }
  }
  await SecureStore.deleteItemAsync(usernameKey(userId)).catch(() => {})
  return { success: true }
}
