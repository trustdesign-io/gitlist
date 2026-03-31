import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { AuthProvider } from '../AuthProvider'
import { useAuthStore } from '../../stores/auth-store'
import { supabase } from '../../lib/supabase'

jest.mock('../../lib/sentry', () => ({
  sentryIdentifyUser: jest.fn(),
  sentryClearUser: jest.fn(),
}))

jest.mock('../../lib/github-pat', () => ({
  storeGithubToken: jest.fn().mockResolvedValue(undefined),
  loadGithubAccountMeta: jest.fn().mockResolvedValue(null),
}))

// Mock supabase before any imports resolve
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}))

const mockAuth = supabase.auth as unknown as {
  getSession: jest.Mock
  onAuthStateChange: jest.Mock
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: null, isLoading: true })

    mockAuth.getSession.mockResolvedValue({ data: { session: null } })
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
  })

  it('renders children', () => {
    const { getByText } = render(
      <AuthProvider>
        <Text>Hello</Text>
      </AuthProvider>,
    )
    expect(getByText('Hello')).toBeTruthy()
  })

  it('calls setUser(null) when there is no session', async () => {
    render(
      <AuthProvider>
        <Text>Child</Text>
      </AuthProvider>,
    )

    await new Promise((r) => setTimeout(r, 0))

    const { user, isLoading } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isLoading).toBe(false)
  })

  it('calls setUser with mapped user when session exists', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User', avatar_url: null },
        created_at: new Date().toISOString(),
      },
    }
    mockAuth.getSession.mockResolvedValue({ data: { session: mockSession } })

    render(
      <AuthProvider>
        <Text>Child</Text>
      </AuthProvider>,
    )

    await new Promise((r) => setTimeout(r, 0))

    const { user, isLoading } = useAuthStore.getState()
    expect(user).not.toBeNull()
    expect(user?.id).toBe('user-123')
    expect(user?.email).toBe('test@example.com')
    expect(user?.name).toBe('Test User')
    expect(isLoading).toBe(false)
  })

  it('unsubscribes from auth state changes on unmount', () => {
    const unsubscribe = jest.fn()
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    })

    const { unmount } = render(
      <AuthProvider>
        <Text>Child</Text>
      </AuthProvider>,
    )

    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
