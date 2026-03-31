import { signInWithGitHub, signOut } from '../auth'
import { supabase } from '../supabase'

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('expo-linking', () => ({
  createURL: jest.fn().mockReturnValue('gitlist://callback'),
}))

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

const mockAuth = supabase.auth as unknown as {
  signInWithOAuth: jest.Mock
  signOut: jest.Mock
}

describe('signInWithGitHub', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('opens browser URL when OAuth initiation succeeds', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://github.com/login/oauth/authorize?...' },
      error: null,
    })

    const result = await signInWithGitHub()

    expect(result.success).toBe(true)
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: {
        redirectTo: 'gitlist://callback',
        scopes: 'read:user read:org project',
      },
    })
  })

  it('returns failure when Supabase returns an error', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth provider not configured' },
    })

    const result = await signInWithGitHub()

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('OAuth provider not configured')
  })

  it('returns failure when no URL is returned', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    })

    const result = await signInWithGitHub()

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('Could not initiate GitHub sign-in.')
  })
})

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null })
    await signOut()
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1)
  })
})
