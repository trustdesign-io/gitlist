import { Linking } from 'react-native'
import * as ExpoLinking from 'expo-linking'
import { supabase } from './supabase'
import { SignInSchema, SignUpSchema } from '@trustdesign/shared/schemas'
import type { ActionResult } from '@trustdesign/shared/types'
import { sentryTrackSignUp } from './sentry'

export async function signInWithEmail(
  email: string,
  password: string
): Promise<ActionResult> {
  const parsed = SignInSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { success: false, error: 'Invalid email or password.' }
  return { success: true }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<ActionResult> {
  const parsed = SignUpSchema.safeParse({ name, email, password })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  })
  if (error) return { success: false, error: error.message }
  sentryTrackSignUp()
  return { success: true }
}

export async function signInWithGoogle(): Promise<ActionResult> {
  const redirectTo = ExpoLinking.createURL('callback')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) return { success: false, error: error.message }
  if (!data.url) return { success: false, error: 'Could not initiate Google sign-in.' }
  try {
    await Linking.openURL(data.url)
  } catch {
    return { success: false, error: 'Could not open browser for Google sign-in.' }
  }
  return { success: true }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
