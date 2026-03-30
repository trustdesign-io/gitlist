import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'gitlist-nav' })

/** Persist and retrieve the last-viewed board ID for a user. */
export function getLastBoardId(userId: string): string | null {
  return storage.getString(`last-board:${userId}`) ?? null
}

export function setLastBoardId(userId: string, boardId: string): void {
  storage.set(`last-board:${userId}`, boardId)
}

/**
 * Record when a board was last viewed (epoch ms).
 * Used to compute unread/changed indicators on the board list.
 */
export function setLastViewedAt(userId: string, boardId: string): void {
  storage.set(`last-viewed:${userId}:${boardId}`, String(Date.now()))
}

/** Returns the last-viewed epoch ms for a board, or null if never viewed. */
export function getLastViewedAt(userId: string, boardId: string): number | null {
  const raw = storage.getString(`last-viewed:${userId}:${boardId}`)
  if (!raw) return null
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}
