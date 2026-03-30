const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

const REQUIRED_SCOPES = ['project', 'read:org']

interface ValidatePATResult {
  valid: boolean
  username?: string
  missingScopes?: string[]
  error?: string
}

/**
 * Validates a GitHub PAT by calling the REST /user endpoint.
 * Returns the authenticated username and checks for required scopes.
 */
export async function validatePAT(pat: string): Promise<ValidatePATResult> {
  try {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (response.status === 401) {
      return { valid: false, error: 'Invalid or expired token.' }
    }

    if (!response.ok) {
      return { valid: false, error: `GitHub API error: ${response.status}` }
    }

    const data = (await response.json()) as { login: string }
    const grantedScopes = (response.headers.get('X-OAuth-Scopes') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const missingScopes = REQUIRED_SCOPES.filter((scope) => {
      // project is granted by the 'project' scope
      // read:org may be granted by 'read:org' or broader 'admin:org'
      if (scope === 'read:org') {
        return !grantedScopes.some((s) => s === 'read:org' || s === 'admin:org')
      }
      return !grantedScopes.includes(scope)
    })

    return { valid: true, username: data.login, missingScopes }
  } catch {
    return { valid: false, error: 'Could not reach GitHub. Check your connection.' }
  }
}

/** Execute a GraphQL query against the GitHub API using a PAT. */
export async function githubGraphQL<T>(
  pat: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`GitHub GraphQL error: ${response.status}`)
  }

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] }
  if (json.errors?.length) {
    throw new Error(json.errors[0].message)
  }
  if (!json.data) {
    throw new Error('No data returned from GitHub GraphQL')
  }
  return json.data
}
