import { signInWithEmail, signUpWithEmail } from '../auth'
import { supabase } from '../supabase'

jest.mock('../sentry', () => ({
  sentryTrackSignUp: jest.fn(),
}))

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}))

const mockAuth = supabase.auth as unknown as {
  signInWithPassword: jest.Mock
  signUp: jest.Mock
}

describe('signInWithEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns success when credentials are valid', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null })

    const result = await signInWithEmail('user@example.com', 'password123')

    expect(result.success).toBe(true)
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('returns failure when Supabase returns an error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    const result = await signInWithEmail('user@example.com', 'wrongpassword')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('Invalid email or password.')
  })

  it('returns validation error for invalid email', async () => {
    const result = await signInWithEmail('not-an-email', 'password123')

    expect(result.success).toBe(false)
    if (!result.success) expect(typeof result.error).toBe('string')
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('signUpWithEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns success when sign-up succeeds', async () => {
    mockAuth.signUp.mockResolvedValue({ error: null })

    const result = await signUpWithEmail('Alice', 'alice@example.com', 'password123')

    expect(result.success).toBe(true)
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password: 'password123',
      options: { data: { name: 'Alice' } },
    })
  })

  it('returns failure when Supabase returns an error', async () => {
    mockAuth.signUp.mockResolvedValue({
      error: { message: 'User already registered' },
    })

    const result = await signUpWithEmail('Alice', 'alice@example.com', 'password123')

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe('User already registered')
  })

  it('returns validation error for short password', async () => {
    const result = await signUpWithEmail('Alice', 'alice@example.com', '123')

    expect(result.success).toBe(false)
    if (!result.success) expect(typeof result.error).toBe('string')
    expect(mockAuth.signUp).not.toHaveBeenCalled()
  })
})
