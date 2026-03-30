import { useCallback, useEffect } from 'react'
import { Linking } from 'react-native'
import { supabase } from '../lib/supabase'
import { handleAuthDeepLink } from '../lib/deep-links'
import { loadGithubPAT } from '../lib/github-pat'
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

  const loadGithubAccount = useCallback(
    async (userId: string) => {
      try {
        const account = await loadGithubPAT(userId)
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
        // Map Supabase auth user to our User type
        const user: User = {
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.name ?? null,
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
      setUser(null) // Ensure loading state resolves even on error
      setGithubAccount(null)
    })

    // Handle deep links that arrive while the app is already running.
    // Covers OAuth and email confirmation flows that return hash-based tokens.
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthDeepLink(url).catch((err) => {
        console.warn('[AuthProvider] Deep link handling failed:', err)
      })
    })

    // Handle cold-start deep link (app launched via deep link URL).
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email ?? '',
            name: session.user.user_metadata?.name ?? null,
            avatarUrl: session.user.user_metadata?.avatar_url ?? null,
            role: 'USER',
            onboardingCompletedAt: null,
            createdAt: new Date(session.user.created_at),
            updatedAt: new Date(),
          }
          setUser(user)
          if (event === 'SIGNED_IN') {
            sentryIdentifyUser(session.user.id, session.user.email ?? '')
            loadGithubAccount(session.user.id).catch(() => {})
          }
        } else {
          setUser(null)
          if (event === 'SIGNED_OUT') {
            sentryClearUser()
            setGithubAccount(null)
          }
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
