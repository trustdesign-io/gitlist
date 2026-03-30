import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'gitlist-cache' })

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
export function getCached<T>(parts: string[]): T | null {
  const key = buildKey(parts)
  const raw = storage.getString(key)
  if (!raw) return null
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.cachedAt > TTL_MS) {
      storage.remove(key)
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
export function setCached<T>(parts: string[], data: T): void {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now() }
  storage.set(buildKey(parts), JSON.stringify(entry))
}

/**
 * Remove a single cache entry.
 */
export function deleteCached(parts: string[]): void {
  storage.remove(buildKey(parts))
}

/**
 * Clear all cached boards and tasks for a given user.
 * Call this when the user unlinks their PAT or changes account.
 */
export function clearUserCache(userId: string): void {
  const keys = storage
    .getAllKeys()
    .filter((k: string) => k.startsWith(`boards:${userId}`) || k.startsWith(`tasks:${userId}`))
  keys.forEach((k: string) => storage.remove(k))
}
