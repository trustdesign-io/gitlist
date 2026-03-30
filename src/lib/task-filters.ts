import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'gitlist-filters' })

export type FilterKey = 'status' | 'assignee'
export type ActiveFilters = Partial<Record<FilterKey, string>>

export function getPersistedFilters(boardId: string): ActiveFilters {
  const raw = storage.getString(`filter:${boardId}`)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as ActiveFilters
  } catch {
    return {}
  }
}

export function setPersistedFilters(boardId: string, filters: ActiveFilters): void {
  storage.set(`filter:${boardId}`, JSON.stringify(filters))
}
