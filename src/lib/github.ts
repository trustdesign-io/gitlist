const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

const REQUIRED_SCOPES = ['project', 'read:org']

export interface Board {
  id: string
  title: string
  shortDescription: string | null
  updatedAt: string
  itemCount: number
  url: string
}

interface ProjectV2Node {
  id: string
  title: string
  shortDescription: string | null
  updatedAt: string
  items: { totalCount: number }
  url: string
}

interface FetchBoardsResponse {
  viewer: {
    projectsV2: { nodes: ProjectV2Node[] }
    organizations: {
      nodes: { projectsV2: { nodes: ProjectV2Node[] } }[]
    }
  }
}

const FETCH_BOARDS_QUERY = `
  query FetchBoards {
    viewer {
      projectsV2(first: 20) {
        nodes {
          id
          title
          shortDescription
          updatedAt
          items { totalCount }
          url
        }
      }
      organizations(first: 10) {
        nodes {
          projectsV2(first: 20) {
            nodes {
              id
              title
              shortDescription
              updatedAt
              items { totalCount }
              url
            }
          }
        }
      }
    }
  }
`

function mapNode(node: ProjectV2Node): Board {
  return {
    id: node.id,
    title: node.title,
    shortDescription: node.shortDescription,
    updatedAt: node.updatedAt,
    itemCount: node.items.totalCount,
    url: node.url,
  }
}

/**
 * Fetch all ProjectV2 boards the authenticated user has access to,
 * including boards from their organisations.
 */
export async function fetchUserBoards(pat: string): Promise<Board[]> {
  const data = await githubGraphQL<FetchBoardsResponse>(pat, FETCH_BOARDS_QUERY)

  const userBoards = data.viewer.projectsV2.nodes.map(mapNode)

  const orgBoards = data.viewer.organizations.nodes.flatMap((org) =>
    org.projectsV2.nodes.map(mapNode)
  )

  // De-duplicate by id (a board may appear in both viewer and org results)
  const seen = new Set<string>()
  const all: Board[] = []
  for (const board of [...userBoards, ...orgBoards]) {
    if (!seen.has(board.id)) {
      seen.add(board.id)
      all.push(board)
    }
  }

  return all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

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
