import AsyncStorage from '@react-native-async-storage/async-storage'

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
  data: T
  cachedAt: number
}

function buildKey(parts: string[]): string {
  return parts.join(':')
}

/**
 * Return cached data for the given key parts, or null if absent / expired.
 */
export async function getCached<T>(parts: string[]): Promise<T | null> {
  const key = buildKey(parts)
  const raw = await AsyncStorage.getItem(key)
  if (!raw) return null
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.cachedAt > TTL_MS) {
      await AsyncStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

/**
 * Persist data under the given key parts with the current timestamp.
 */
export async function setCached<T>(parts: string[], data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now() }
  await AsyncStorage.setItem(buildKey(parts), JSON.stringify(entry))
}

/**
 * Remove a single cache entry.
 */
export async function deleteCached(parts: string[]): Promise<void> {
  await AsyncStorage.removeItem(buildKey(parts))
}

/**
 * Clear all cached boards and tasks for a given user.
 * Call this when the user unlinks their PAT or changes account.
 */
export async function clearUserCache(userId: string): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys()
  const userKeys = allKeys.filter(
    (k) => k.startsWith(`boards:${userId}`) || k.startsWith(`tasks:${userId}`)
  )
  if (userKeys.length > 0) {
    await AsyncStorage.multiRemove(userKeys)
  }
}
