import { handleAuthDeepLink } from '../deep-links'
import { supabase } from '../supabase'

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
    },
  },
}))

const mockAuth = supabase.auth as unknown as { setSession: jest.Mock }

describe('handleAuthDeepLink', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns false for unrelated URLs', async () => {
    expect(await handleAuthDeepLink('https://example.com/login')).toBe(false)
    expect(await handleAuthDeepLink('starter-native://home')).toBe(false)
    expect(mockAuth.setSession).not.toHaveBeenCalled()
  })

  it('returns false for callback URL with no hash', async () => {
    expect(await handleAuthDeepLink('starter-native://callback')).toBe(false)
    expect(mockAuth.setSession).not.toHaveBeenCalled()
  })

  it('returns false for callback URL with hash but no recognised params', async () => {
    expect(await handleAuthDeepLink('starter-native://callback#foo=bar')).toBe(false)
    expect(mockAuth.setSession).not.toHaveBeenCalled()
  })

  it('calls setSession and returns true for OAuth hash flow', async () => {
    mockAuth.setSession.mockResolvedValue({ error: null })
    const url = 'starter-native://callback#access_token=tok123&refresh_token=ref456'
    const result = await handleAuthDeepLink(url)
    expect(result).toBe(true)
    expect(mockAuth.setSession).toHaveBeenCalledWith({
      access_token: 'tok123',
      refresh_token: 'ref456',
    })
  })

  it('returns true and logs a warning when setSession fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockAuth.setSession.mockResolvedValue({ error: { message: 'invalid token' } })
    const url = 'starter-native://callback#access_token=tok&refresh_token=ref'
    const result = await handleAuthDeepLink(url)
    expect(result).toBe(true)
    expect(warnSpy).toHaveBeenCalledWith('[deep-links] setSession error:', 'invalid token')
    warnSpy.mockRestore()
  })

  it('returns true and logs for error hash params', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const url = 'starter-native://callback#error=access_denied&error_description=User+cancelled'
    const result = await handleAuthDeepLink(url)
    expect(result).toBe(true)
    expect(warnSpy).toHaveBeenCalledWith(
      '[deep-links] auth callback error:',
      'access_denied',
      'User cancelled',
    )
    expect(mockAuth.setSession).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('handles Expo Go tunnel URLs', async () => {
    mockAuth.setSession.mockResolvedValue({ error: null })
    const url = 'exp://localhost:8081/--/callback#access_token=tok&refresh_token=ref'
    expect(await handleAuthDeepLink(url)).toBe(true)
    expect(mockAuth.setSession).toHaveBeenCalled()
  })
})
