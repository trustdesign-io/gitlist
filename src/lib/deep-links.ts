import { supabase } from './supabase'

// Known callback URL patterns.
// The Expo Go pattern uses the full /--/callback path segment to avoid
// false-positives on unrelated URLs that might contain 'callback'.
const CALLBACK_PATTERNS = [
  'starter-native://callback',
  '/--/callback', // Expo Go: exp://localhost:8081/--/callback
]

function isAuthCallbackUrl(url: string): boolean {
  return CALLBACK_PATTERNS.some((pattern) => {
    const idx = url.indexOf(pattern)
    if (idx === -1) return false
    // Ensure the match is at a path/host boundary (not mid-word)
    const after = url[idx + pattern.length]
    return after === undefined || after === '?' || after === '#' || after === '/'
  })
}

/**
 * Handles a Supabase auth callback URL for the implicit / OAuth hash flow.
 *
 * Called by AuthProvider for every incoming deep link. PKCE code exchange is
 * handled separately in the callback screen via useLocalSearchParams.
 *
 * Supported formats:
 *   starter-native://callback#access_token=...&refresh_token=...
 *   starter-native://callback#error=...&error_description=...
 *
 * Returns true if the URL was an auth callback (regardless of outcome).
 */
export async function handleAuthDeepLink(url: string): Promise<boolean> {
  if (!isAuthCallbackUrl(url)) return false

  const hash = url.includes('#') ? url.split('#')[1] : ''
  if (!hash) return false

  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) {
      console.warn('[deep-links] setSession error:', error.message)
    }
    return true
  }

  const err = params.get('error')
  if (err) {
    console.warn('[deep-links] auth callback error:', err, params.get('error_description'))
    return true
  }

  return false
}
