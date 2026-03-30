import { useEffect } from 'react'
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'

/**
 * Auth callback screen — handles Supabase email confirmation and OAuth redirects.
 *
 * Deep link: starter-native://callback?code=<pkce_code>
 *
 * PKCE code exchange is handled here exclusively. Hash-based (implicit flow)
 * tokens are handled by AuthProvider's Linking listener, which fires before
 * navigation reaches this screen.
 *
 * Once the session is established, onAuthStateChange in AuthProvider updates
 * the user state and the root layout redirects to the appropriate screen.
 */
export default function AuthCallbackScreen() {
  const router = useRouter()
  const { code, error, error_description } = useLocalSearchParams<{
    code?: string
    error?: string
    error_description?: string
  }>()
  const { theme } = useTheme()

  useEffect(() => {
    async function process() {
      if (error) {
        // Prefer error_description (human-readable) over the error slug
        const message = error_description ?? error
        Alert.alert('Sign in failed', message, [
          { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
        ])
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          Alert.alert('Sign in failed', exchangeError.message, [
            { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
          ])
        }
        // On success, AuthProvider's onAuthStateChange fires → root layout redirects
        return
      }

      // No recognisable params — fall back to sign-in
      router.replace('/(auth)/sign-in')
    }

    process()
  }, [code, error, error_description, router])

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.text, { color: theme.colors.mutedForeground }]}>Signing you in…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { fontSize: 16 },
})
