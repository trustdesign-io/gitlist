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

// ---------------------------------------------------------------------------
// Board items (task list)
// ---------------------------------------------------------------------------

export interface TaskAssignee {
  login: string
  avatarUrl: string
}

export interface TaskLabel {
  name: string
  color: string
}

export interface Task {
  id: string
  title: string
  /** Resolved status name from the Status single-select field, or null */
  status: string | null
  statusOptionId: string | null
  assignees: TaskAssignee[]
  labels: TaskLabel[]
  /** Null for DraftIssues */
  issueNumber: number | null
  issueState: 'OPEN' | 'CLOSED' | null
  isDraft: boolean
}

export interface BoardColumn {
  name: string
  tasks: Task[]
}

/** Status field option as returned by the GraphQL API */
interface StatusOption {
  id: string
  name: string
  color: string
}

interface FieldNode {
  id?: string
  name?: string
  options?: StatusOption[]
}

interface FieldValueNode {
  field?: { name?: string }
  name?: string
  optionId?: string
}

type ItemContent =
  | {
      __typename: 'Issue'
      title: string
      number: number
      state: 'OPEN' | 'CLOSED'
      url: string
      assignees: { nodes: { login: string; avatarUrl: string }[] }
      labels: { nodes: { name: string; color: string }[] }
    }
  | { __typename: 'DraftIssue'; title: string }
  | null

interface ItemNode {
  id: string
  fieldValues: { nodes: FieldValueNode[] }
  content: ItemContent
}

interface FetchBoardItemsResponse {
  node: {
    title: string
    fields: { nodes: FieldNode[] }
    items: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: ItemNode[]
    }
  }
}

const FETCH_BOARD_ITEMS_QUERY = `
  query FetchBoardItems($projectId: ID!, $cursor: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        title
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options { id name color }
            }
          }
        }
        items(first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  field { ... on ProjectV2SingleSelectField { name } }
                  name
                  optionId
                }
              }
            }
            content {
              ... on Issue {
                __typename
                title
                number
                state
                url
                assignees(first: 5) { nodes { login avatarUrl } }
                labels(first: 5) { nodes { name color } }
              }
              ... on DraftIssue {
                __typename
                title
              }
            }
          }
        }
      }
    }
  }
`

function mapItem(item: ItemNode): Task {
  const statusFieldValue = item.fieldValues.nodes.find(
    (fv) => fv.field?.name?.toLowerCase() === 'status' && fv.name != null
  )

  const content = item.content

  if (!content) {
    return {
      id: item.id,
      title: '(No title)',
      status: statusFieldValue?.name ?? null,
      statusOptionId: statusFieldValue?.optionId ?? null,
      assignees: [],
      labels: [],
      issueNumber: null,
      issueState: null,
      isDraft: true,
    }
  }

  if (content.__typename === 'Issue') {
    return {
      id: item.id,
      title: content.title,
      status: statusFieldValue?.name ?? null,
      statusOptionId: statusFieldValue?.optionId ?? null,
      assignees: content.assignees.nodes,
      labels: content.labels.nodes,
      issueNumber: content.number,
      issueState: content.state,
      isDraft: false,
    }
  }

  // DraftIssue
  return {
    id: item.id,
    title: content.title,
    status: statusFieldValue?.name ?? null,
    statusOptionId: statusFieldValue?.optionId ?? null,
    assignees: [],
    labels: [],
    issueNumber: null,
    issueState: null,
    isDraft: true,
  }
}

/**
 * Fetch all items from a ProjectV2 board using cursor-based pagination.
 * Resolves status field option names so each task has a human-readable status.
 */
export async function fetchBoardItems(pat: string, projectId: string): Promise<Task[]> {
  const tasks: Task[] = []
  let cursor: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    const variables: Record<string, unknown> = { projectId }
    if (cursor) variables.cursor = cursor

    const data = await githubGraphQL<FetchBoardItemsResponse>(
      pat,
      FETCH_BOARD_ITEMS_QUERY,
      variables
    )

    const page = data.node.items
    for (const item of page.nodes) {
      tasks.push(mapItem(item))
    }

    hasNextPage = page.pageInfo.hasNextPage
    cursor = page.pageInfo.endCursor
  }

  return tasks
}

/**
 * Group a flat list of tasks into columns ordered by first-seen status.
 * Tasks with no status are collected in a trailing "No Status" column.
 */
export function groupTasksByStatus(tasks: Task[]): BoardColumn[] {
  const columnMap = new Map<string, Task[]>()

  for (const task of tasks) {
    const key = task.status ?? 'No Status'
    if (!columnMap.has(key)) {
      columnMap.set(key, [])
    }
    columnMap.get(key)!.push(task)
  }

  const columns: BoardColumn[] = []
  for (const [name, columnTasks] of columnMap) {
    if (name !== 'No Status') {
      columns.push({ name, tasks: columnTasks })
    }
  }

  const noStatus = columnMap.get('No Status')
  if (noStatus && noStatus.length > 0) {
    columns.push({ name: 'No Status', tasks: noStatus })
  }

  return columns
}

// ---------------------------------------------------------------------------

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
