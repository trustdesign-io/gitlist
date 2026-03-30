import { githubGraphQL } from './github'
import { getCached, setCached } from './cache'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldDataType =
  | 'SINGLE_SELECT'
  | 'DATE'
  | 'TEXT'
  | 'NUMBER'
  | 'ITERATION'
  | 'UNKNOWN'

/** How the field should be presented in the UI. */
export type UIControl =
  | 'single-select-picker'
  | 'date-input'
  | 'text-input'
  | 'number-input'
  | 'read-only'

export interface FieldOption {
  id: string
  name: string
  color: string
}

export interface BoardField {
  id: string
  name: string
  dataType: FieldDataType
  /** Populated for SINGLE_SELECT fields only. */
  options: FieldOption[]
}

export interface FieldMapping {
  field: BoardField
  control: UIControl
  /** True when this is the Status field that drives board column grouping. */
  isStatus: boolean
  /** True when this looks like a priority field (Priority, Urgency, etc.). */
  isPriority: boolean
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/** Field names (lowercased) that we treat as priority fields. */
const PRIORITY_NAMES = ['priority', 'urgency', 'p0', 'p1', 'p2']

const FETCH_BOARD_FIELDS_QUERY = `
  query FetchBoardFields($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        fields(first: 50) {
          nodes {
            ... on ProjectV2SingleSelectField {
              __typename
              id
              name
              options { id name color }
            }
            ... on ProjectV2IterationField {
              __typename
              id
              name
            }
            ... on ProjectV2FieldCommon {
              __typename
              id
              name
              dataType
            }
          }
        }
      }
    }
  }
`

interface RawFieldNode {
  __typename: string
  id: string
  name: string
  dataType?: string
  options?: { id: string; name: string; color: string }[]
}

interface FetchBoardFieldsResponse {
  node: {
    fields: { nodes: RawFieldNode[] }
  } | null
}

function parseDataType(node: RawFieldNode): FieldDataType {
  if (node.__typename === 'ProjectV2SingleSelectField') return 'SINGLE_SELECT'
  if (node.__typename === 'ProjectV2IterationField') return 'ITERATION'
  switch (node.dataType?.toUpperCase()) {
    case 'DATE': return 'DATE'
    case 'TEXT': return 'TEXT'
    case 'NUMBER': return 'NUMBER'
    default: return 'UNKNOWN'
  }
}

function toControl(dataType: FieldDataType): UIControl {
  switch (dataType) {
    case 'SINGLE_SELECT': return 'single-select-picker'
    case 'DATE': return 'date-input'
    case 'TEXT': return 'text-input'
    case 'NUMBER': return 'number-input'
    // Iteration pickers are complex — display only for now
    default: return 'read-only'
  }
}

function buildMapping(field: BoardField): FieldMapping {
  const lower = field.name.toLowerCase()
  return {
    field,
    control: toControl(field.dataType),
    isStatus: lower === 'status',
    isPriority: PRIORITY_NAMES.some((p) => lower === p),
  }
}

/**
 * Fetch all field definitions for a ProjectV2 board and return their
 * UI mappings. Results are cached in MMKV with a 24-hour TTL (same as tasks).
 */
export async function fetchBoardFields(
  pat: string,
  userId: string,
  projectId: string
): Promise<FieldMapping[]> {
  const cacheKey = ['fields', userId, projectId]
  const cached = getCached<FieldMapping[]>(cacheKey)
  if (cached) return cached

  const data = await githubGraphQL<FetchBoardFieldsResponse>(
    pat,
    FETCH_BOARD_FIELDS_QUERY,
    { projectId }
  )

  if (!data.node) return []

  const mappings: FieldMapping[] = data.node.fields.nodes
    .filter((n) => n.id && n.name)
    .map((n) => {
      const field: BoardField = {
        id: n.id,
        name: n.name,
        dataType: parseDataType(n),
        options: n.options ?? [],
      }
      return buildMapping(field)
    })

  setCached(cacheKey, mappings)
  return mappings
}

// ---------------------------------------------------------------------------
// Update mutation
// ---------------------------------------------------------------------------

/** Union of supported update values passed to the GitHub API. */
export type FieldUpdateValue =
  | { singleSelectOptionId: string }
  | { date: string }
  | { text: string }
  | { number: number }

const UPDATE_FIELD_VALUE_MUTATION = `
  mutation UpdateFieldValue(
    $projectId: ID!
    $itemId: ID!
    $fieldId: ID!
    $value: ProjectV2FieldValue!
  ) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: $value
    }) {
      projectV2Item { id }
    }
  }
`

interface UpdateFieldValueResponse {
  updateProjectV2ItemFieldValue: { projectV2Item: { id: string } }
}

/**
 * Update a single field value on a ProjectV2 item.
 * Throws on network or API error.
 */
export async function updateFieldValue(
  pat: string,
  projectId: string,
  itemId: string,
  fieldId: string,
  value: FieldUpdateValue
): Promise<void> {
  await githubGraphQL<UpdateFieldValueResponse>(pat, UPDATE_FIELD_VALUE_MUTATION, {
    projectId,
    itemId,
    fieldId,
    value,
  })
}
