/**
 * In-memory cache implementation (replaces react-native-mmkv native module).
 * Suitable for development and compilation - data is not persisted across app restarts.
 */

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
  data: T
  cachedAt: number
}

// In-memory storage fallback (will be cleared when app restarts)
const memoryStorage = new Map<string, string>()

function buildKey(parts: string[]): string {
  return parts.join(':')
}

/**
 * Return cached data for the given key parts, or null if absent / expired.
 */
export async function getCached<T>(parts: string[]): Promise<T | null> {
  const key = buildKey(parts)
  const raw = memoryStorage.get(key)
  if (!raw) return null
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.cachedAt > TTL_MS) {
      memoryStorage.delete(key)
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
  memoryStorage.set(buildKey(parts), JSON.stringify(entry))
}

/**
 * Remove a single cache entry.
 */
export async function deleteCached(parts: string[]): Promise<void> {
  memoryStorage.delete(buildKey(parts))
}

/**
 * Clear all cached boards and tasks for a given user.
 * Call this when the user unlinks their PAT or changes account.
 */
export async function clearUserCache(userId: string): Promise<void> {
  const allKeys = Array.from(memoryStorage.keys())
  for (const key of allKeys) {
    if (key.startsWith(`boards:${userId}`) || key.startsWith(`tasks:${userId}`)) {
      memoryStorage.delete(key)
    }
  }
}
