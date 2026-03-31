import { useCallback, useEffect, useRef } from 'react'
import { Linking } from 'react-native'
import { supabase } from '../lib/supabase'
import { handleAuthDeepLink } from '../lib/deep-links'
import { storeGithubToken, loadGithubAccountMeta, removeGithubToken } from '../lib/github-pat'
import { useAuthStore } from '../stores/auth-store'
import { useGithubStore } from '../stores/github-store'
import { sentryIdentifyUser, sentryClearUser } from '../lib/sentry'
import type { User } from '../types'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const { setGithubAccount } = useGithubStore()
  // Track the current user ID so we can clean up SecureStore on sign-out,
  // when the session (and user ID) is no longer available.
  const userIdRef = useRef<string | null>(null)

  const loadGithubAccount = useCallback(
    async (userId: string) => {
      try {
        const account = await loadGithubAccountMeta(userId)
        setGithubAccount(account?.githubUsername ?? null)
      } catch {
        setGithubAccount(null)
      }
    },
    [setGithubAccount]
  )

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        userIdRef.current = session.user.id
        const user: User = {
          id: session.user.id,
          email: session.user.email ?? '',
          name:
            session.user.user_metadata?.name ??
            session.user.user_metadata?.full_name ??
            null,
          avatarUrl: session.user.user_metadata?.avatar_url ?? null,
          role: 'USER',
          onboardingCompletedAt: null,
          createdAt: new Date(session.user.created_at),
          updatedAt: new Date(),
        }
        setUser(user)
        await loadGithubAccount(session.user.id)
      } else {
        setUser(null)
        setGithubAccount(null)
      }
    }).catch((error) => {
      console.warn('Failed to get session:', error)
      setUser(null)
      setGithubAccount(null)
    })

    // Handle deep links that arrive while the app is already running.
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthDeepLink(url).catch((err) => {
        console.warn('[AuthProvider] Deep link handling failed:', err)
      })
    })

    // Handle cold-start deep link.
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          handleAuthDeepLink(url).catch((err) => {
            console.warn('[AuthProvider] Initial URL handling failed:', err)
          })
        }
      })
      .catch((err) => {
        console.warn('[AuthProvider] getInitialURL failed:', err)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          userIdRef.current = session.user.id
          const user: User = {
            id: session.user.id,
            email: session.user.email ?? '',
            name:
              session.user.user_metadata?.name ??
              session.user.user_metadata?.full_name ??
              null,
            avatarUrl: session.user.user_metadata?.avatar_url ?? null,
            role: 'USER',
            onboardingCompletedAt: null,
            createdAt: new Date(session.user.created_at),
            updatedAt: new Date(),
          }
          setUser(user)

          if (event === 'SIGNED_IN') {
            sentryIdentifyUser(session.user.id, session.user.email ?? '')
          }

          // Store GitHub token on sign-in and whenever Supabase refreshes the
          // session — provider_token may be rotated on TOKEN_REFRESHED.
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session.provider_token) {
            const username =
              session.user.user_metadata?.user_name ??
              session.user.user_metadata?.login ??
              ''
            storeGithubToken(session.user.id, session.provider_token, username).catch((err) => {
              console.warn('[AuthProvider] Failed to store GitHub token:', err)
            })
            setGithubAccount(username || null)
          } else if (event === 'SIGNED_IN') {
            // Fallback: load username from SecureStore if no provider_token
            loadGithubAccount(session.user.id).catch(() => {})
          }
        } else {
          if (event === 'SIGNED_OUT') {
            sentryClearUser()
            setGithubAccount(null)
            // Clean up the stored token for the user who just signed out
            if (userIdRef.current) {
              removeGithubToken(userIdRef.current).catch((err) => {
                console.warn('[AuthProvider] Failed to remove GitHub token on sign-out:', err)
              })
              userIdRef.current = null
            }
          }
          setUser(null)
        }
      }
    )

    return () => {
      linkSubscription.remove()
      subscription.unsubscribe()
    }
  }, [setUser, setGithubAccount, loadGithubAccount])

  return <>{children}</>
}
