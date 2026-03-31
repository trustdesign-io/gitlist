import AsyncStorage from '@react-native-async-storage/async-storage'

export type FilterKey = 'status' | 'assignee' | 'label'
export type ActiveFilters = Partial<Record<FilterKey, string>>

export async function getPersistedFilters(boardId: string): Promise<ActiveFilters> {
  const raw = await AsyncStorage.getItem(`filter:${boardId}`)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as ActiveFilters
  } catch {
    return {}
  }
}

export async function setPersistedFilters(boardId: string, filters: ActiveFilters): Promise<void> {
  await AsyncStorage.setItem(`filter:${boardId}`, JSON.stringify(filters))
}
