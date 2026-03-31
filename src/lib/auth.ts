import * as ExpoLinking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'
import { clearUserCache } from './cache'
import type { ActionResult } from '@trustdesign/shared/types'

export async function signInWithGitHub(): Promise<ActionResult> {
  const redirectTo = ExpoLinking.createURL('callback')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
      scopes: 'read:user read:org project',
    },
  })
  if (error) return { success: false, error: error.message }
  if (!data.url) return { success: false, error: 'Could not initiate GitHub sign-in.' }
  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type === 'success' && result.url) {
      // Extract tokens from the callback URL and set the session
      const { handleAuthDeepLink } = await import('./deep-links')
      await handleAuthDeepLink(result.url)
    }
  } catch {
    return { success: false, error: 'Could not open browser for GitHub sign-in.' }
  }
  return { success: true }
}

export async function signOut(): Promise<void> {
  // Clear cached boards and tasks before signing out so the next user
  // doesn't see stale data from the previous session.
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id) {
    await clearUserCache(user.id)
  }
  await supabase.auth.signOut()
}
