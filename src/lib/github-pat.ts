import * as SecureStore from 'expo-secure-store'
import type { ActionResult } from '@trustdesign/shared/types'

const tokenKey = (userId: string) => `github_token_${userId}`
const usernameKey = (userId: string) => `github_username_${userId}`

export interface GithubAccountMeta {
  githubUsername: string
}

/**
 * Store the GitHub OAuth token and username in SecureStore.
 * Called by AuthProvider on SIGNED_IN when provider_token is available.
 */
export async function storeGithubToken(
  userId: string,
  token: string,
  username: string
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(tokenKey(userId), token).catch(() => {}),
    SecureStore.setItemAsync(usernameKey(userId), username).catch(() => {}),
  ])
}

/**
 * Load the GitHub username from SecureStore for display purposes.
 */
export async function loadGithubAccountMeta(userId: string): Promise<GithubAccountMeta | null> {
  try {
    const username = await SecureStore.getItemAsync(usernameKey(userId))
    if (username) return { githubUsername: username }
  } catch {}
  return null
}

/**
 * Fetch the GitHub OAuth token from SecureStore.
 * Called before making GitHub API requests.
 */
export async function fetchGithubPAT(userId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(tokenKey(userId))
  } catch {
    return null
  }
}

/**
 * Remove GitHub token and username from SecureStore (called on sign-out).
 */
export async function removeGithubToken(userId: string): Promise<ActionResult> {
  await Promise.all([
    SecureStore.deleteItemAsync(tokenKey(userId)).catch(() => {}),
    SecureStore.deleteItemAsync(usernameKey(userId)).catch(() => {}),
  ])
  return { success: true }
}
