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

export interface TaskFieldValue {
  fieldName: string
  /** Display value (option name, date string, text, etc.) */
  value: string
  /** Populated for single-select fields */
  optionId?: string
  /** Populated for single-select fields (hex colour from GitHub) */
  color?: string
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
  /** All custom field values fetched with the board items query */
  fieldValues: TaskFieldValue[]
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
  __typename?: string
  field?: { name?: string }
  /** Single-select: option name */
  name?: string
  optionId?: string
  /** Single-select: option colour */
  color?: string
  /** Date field value */
  date?: string
  /** Text field value */
  text?: string
  /** Number field value */
  number?: number
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
                  __typename
                  field { ... on ProjectV2SingleSelectField { name } }
                  name
                  optionId
                  color
                }
                ... on ProjectV2ItemFieldDateValue {
                  __typename
                  field { ... on ProjectV2FieldCommon { name } }
                  date
                }
                ... on ProjectV2ItemFieldTextValue {
                  __typename
                  field { ... on ProjectV2FieldCommon { name } }
                  text
                }
                ... on ProjectV2ItemFieldNumberValue {
                  __typename
                  field { ... on ProjectV2FieldCommon { name } }
                  number
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

function extractFieldValues(nodes: FieldValueNode[]): TaskFieldValue[] {
  const values: TaskFieldValue[] = []
  for (const fv of nodes) {
    const fieldName = fv.field?.name
    if (!fieldName) continue
    if (fv.__typename === 'ProjectV2ItemFieldSingleSelectValue' && fv.name != null) {
      values.push({ fieldName, value: fv.name, optionId: fv.optionId, color: fv.color })
    } else if (fv.__typename === 'ProjectV2ItemFieldDateValue' && fv.date != null) {
      values.push({ fieldName, value: fv.date })
    } else if (fv.__typename === 'ProjectV2ItemFieldTextValue' && fv.text != null) {
      values.push({ fieldName, value: fv.text })
    } else if (fv.__typename === 'ProjectV2ItemFieldNumberValue' && fv.number != null) {
      values.push({ fieldName, value: String(fv.number) })
    }
  }
  return values
}

function mapItem(item: ItemNode): Task {
  const fieldValues = extractFieldValues(item.fieldValues.nodes)
  const statusFieldValue = fieldValues.find((fv) => fv.fieldName.toLowerCase() === 'status')

  const content = item.content

  if (!content) {
    return {
      id: item.id,
      title: '(No title)',
      status: statusFieldValue?.value ?? null,
      statusOptionId: statusFieldValue?.optionId ?? null,
      assignees: [],
      labels: [],
      issueNumber: null,
      issueState: null,
      isDraft: true,
      fieldValues,
    }
  }

  if (content.__typename === 'Issue') {
    return {
      id: item.id,
      title: content.title,
      status: statusFieldValue?.value ?? null,
      statusOptionId: statusFieldValue?.optionId ?? null,
      assignees: content.assignees.nodes,
      labels: content.labels.nodes,
      issueNumber: content.number,
      issueState: content.state,
      isDraft: false,
      fieldValues,
    }
  }

  // DraftIssue
  return {
    id: item.id,
    title: content.title,
    status: statusFieldValue?.value ?? null,
    statusOptionId: statusFieldValue?.optionId ?? null,
    assignees: [],
    labels: [],
    issueNumber: null,
    issueState: null,
    isDraft: true,
    fieldValues,
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
// Task detail
// ---------------------------------------------------------------------------

/** A single field value as returned from the board, normalised for the UI. */
export interface RawFieldValue {
  fieldName: string
  /** Human-readable display value (option name, date string, text, number). */
  value: string | null
  /** Option ID — only set for SINGLE_SELECT fields; used when sending updates. */
  optionId: string | null
}

export interface TaskDetail {
  id: string
  title: string
  body: string | null
  isDraft: boolean
  issueNumber: number | null
  issueState: 'OPEN' | 'CLOSED' | null
  issueUrl: string | null
  author: string | null
  createdAt: string
  updatedAt: string
  status: string | null
  /** From "Priority" single-select field if present */
  priority: string | null
  /** From "Due Date" date field if present */
  dueDate: string | null
  assignees: TaskAssignee[]
  labels: TaskLabel[]
  /** All field values from the board, keyed by field name. */
  rawFields: RawFieldValue[]
}

interface TaskDetailFieldValue {
  field?: { name?: string }
  name?: string
  optionId?: string
  date?: string
  text?: string
  number?: number
}

type TaskDetailContent =
  | {
      __typename: 'Issue'
      title: string
      number: number
      state: 'OPEN' | 'CLOSED'
      url: string
      body: string | null
      createdAt: string
      updatedAt: string
      author: { login: string } | null
      assignees: { nodes: { login: string; avatarUrl: string }[] }
      labels: { nodes: { name: string; color: string }[] }
    }
  | {
      __typename: 'DraftIssue'
      title: string
      body: string | null
      createdAt: string
      updatedAt: string
      creator: { login: string } | null
      assignees: { nodes: { login: string; avatarUrl: string }[] }
    }
  | null

interface FetchTaskDetailResponse {
  node: {
    id: string
    fieldValues: { nodes: TaskDetailFieldValue[] }
    content: TaskDetailContent
  } | null
}

const FETCH_TASK_DETAIL_QUERY = `
  query FetchTaskDetail($itemId: ID!) {
    node(id: $itemId) {
      ... on ProjectV2Item {
        id
        fieldValues(first: 20) {
          nodes {
            ... on ProjectV2ItemFieldSingleSelectValue {
              field { ... on ProjectV2SingleSelectField { name } }
              name
              optionId
            }
            ... on ProjectV2ItemFieldDateValue {
              field { ... on ProjectV2FieldCommon { name } }
              date
            }
            ... on ProjectV2ItemFieldTextValue {
              field { ... on ProjectV2FieldCommon { name } }
              text
            }
            ... on ProjectV2ItemFieldNumberValue {
              field { ... on ProjectV2FieldCommon { name } }
              number
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
            body
            createdAt
            updatedAt
            author { login }
            assignees(first: 10) { nodes { login avatarUrl } }
            labels(first: 10) { nodes { name color } }
          }
          ... on DraftIssue {
            __typename
            title
            body
            createdAt
            updatedAt
            creator { login }
            assignees(first: 10) { nodes { login avatarUrl } }
          }
        }
      }
    }
  }
`

function findFieldValue(
  nodes: TaskDetailFieldValue[],
  fieldName: string
): TaskDetailFieldValue | undefined {
  return nodes.find((n) => n.field?.name?.toLowerCase() === fieldName.toLowerCase())
}

/**
 * Fetch full detail for a single ProjectV2 item by its node ID.
 */
export async function fetchTaskDetail(pat: string, itemId: string): Promise<TaskDetail> {
  const data = await githubGraphQL<FetchTaskDetailResponse>(pat, FETCH_TASK_DETAIL_QUERY, {
    itemId,
  })

  if (!data.node) {
    throw new Error('Task not found')
  }

  const { fieldValues, content } = data.node
  const fieldNodes = fieldValues.nodes

  const statusField = findFieldValue(fieldNodes, 'status')
  const priorityField = findFieldValue(fieldNodes, 'priority')
  const dueDateField = findFieldValue(fieldNodes, 'due date')

  const status = statusField?.name ?? null
  const priority = priorityField?.name ?? null
  const dueDate = dueDateField?.date ?? null

  // Build a normalised list of all field values for the dynamic fields UI
  const rawFields: RawFieldValue[] = fieldNodes
    .filter((n) => n.field?.name)
    .map((n) => {
      const fieldName = n.field!.name!
      if (n.name != null) {
        // SINGLE_SELECT — n.name is the option label, n.optionId is the option ID
        return { fieldName, value: n.name, optionId: n.optionId ?? null }
      }
      if (n.date != null) return { fieldName, value: n.date, optionId: null }
      if (n.text != null) return { fieldName, value: n.text, optionId: null }
      if (n.number != null) return { fieldName, value: String(n.number), optionId: null }
      return { fieldName, value: null, optionId: null }
    })
    .filter((f) => f.value !== null)

  if (!content) {
    return {
      id: data.node.id,
      title: '(No title)',
      body: null,
      isDraft: true,
      issueNumber: null,
      issueState: null,
      issueUrl: null,
      author: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status,
      priority,
      dueDate,
      assignees: [],
      labels: [],
      rawFields,
    }
  }

  if (content.__typename === 'Issue') {
    return {
      id: data.node.id,
      title: content.title,
      body: content.body,
      isDraft: false,
      issueNumber: content.number,
      issueState: content.state,
      issueUrl: content.url,
      author: content.author?.login ?? null,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      status,
      priority,
      dueDate,
      assignees: content.assignees.nodes,
      labels: content.labels.nodes,
      rawFields,
    }
  }

  // DraftIssue
  return {
    id: data.node.id,
    title: content.title,
    body: content.body,
    isDraft: true,
    issueNumber: null,
    issueState: null,
    issueUrl: null,
    author: content.creator?.login ?? null,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    status,
    priority,
    dueDate,
    assignees: content.assignees.nodes,
    labels: [],
    rawFields,
  }
}

// ---------------------------------------------------------------------------
// Add draft task
// ---------------------------------------------------------------------------

const ADD_DRAFT_ITEM_MUTATION = `
  mutation AddDraftItem($projectId: ID!, $title: String!) {
    addProjectV2DraftItem(input: { projectId: $projectId, title: $title }) {
      projectItem {
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
          ... on DraftIssue {
            __typename
            title
          }
        }
      }
    }
  }
`

interface AddDraftItemResponse {
  addProjectV2DraftItem: {
    projectItem: ItemNode
  }
}

/**
 * Create a draft item on a ProjectV2 board via the addProjectV2DraftItem mutation.
 * Returns the newly created task mapped to the local Task shape.
 */
export async function addDraftTask(pat: string, projectId: string, title: string): Promise<Task> {
  const data = await githubGraphQL<AddDraftItemResponse>(pat, ADD_DRAFT_ITEM_MUTATION, {
    projectId,
    title,
  })
  return mapItem(data.addProjectV2DraftItem.projectItem)
}

// ---------------------------------------------------------------------------
// Status field + task mutations (for swipe gestures)
// ---------------------------------------------------------------------------

export interface StatusField {
  fieldId: string
  options: { id: string; name: string }[]
}

interface FetchStatusFieldResponse {
  node: {
    fields: {
      nodes: Array<{ id?: string; name?: string; options?: Array<{ id: string; name: string }> }>
    }
  }
}

const FETCH_STATUS_FIELD_QUERY = `query FetchStatusField($projectId:ID!){node(id:$projectId){... on ProjectV2{fields(first:20){nodes{... on ProjectV2SingleSelectField{id name options{id name}}}}}}}`

export async function fetchStatusField(
  pat: string,
  projectId: string
): Promise<StatusField | null> {
  const data = await githubGraphQL<FetchStatusFieldResponse>(
    pat,
    FETCH_STATUS_FIELD_QUERY,
    { projectId }
  )
  const statusNode = data.node.fields.nodes.find(
    (f) => f.name?.toLowerCase() === 'status' && f.options != null
  )
  if (!statusNode?.id || !statusNode.options) return null
  return { fieldId: statusNode.id, options: statusNode.options }
}

const DONE_NAMES = new Set(['done', 'complete', 'completed', 'closed'])

export function findDoneOption(
  options: { id: string; name: string }[]
): { id: string; name: string } | undefined {
  return options.find((o) => DONE_NAMES.has(o.name.toLowerCase()))
}

const SET_TASK_STATUS_MUTATION = `mutation SetTaskStatus($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){updateProjectV2ItemFieldValue(input:{projectId:$projectId itemId:$itemId fieldId:$fieldId value:{singleSelectOptionId:$optionId}}){projectV2Item{id}}}`

export async function setTaskStatus(
  pat: string,
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string
): Promise<void> {
  await githubGraphQL(pat, SET_TASK_STATUS_MUTATION, { projectId, itemId, fieldId, optionId })
}

const REMOVE_TASK_MUTATION = `mutation RemoveTask($projectId:ID!,$itemId:ID!){deleteProjectV2Item(input:{projectId:$projectId itemId:$itemId}){deletedItemId}}`

export async function removeTaskFromBoard(
  pat: string,
  projectId: string,
  itemId: string
): Promise<void> {
  await githubGraphQL(pat, REMOVE_TASK_MUTATION, { projectId, itemId })
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
