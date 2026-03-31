import { Linking } from 'react-native'
import * as ExpoLinking from 'expo-linking'
import { supabase } from './supabase'
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
    await Linking.openURL(data.url)
  } catch {
    return { success: false, error: 'Could not open browser for GitHub sign-in.' }
  }
  return { success: true }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
