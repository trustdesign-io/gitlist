import AsyncStorage from '@react-native-async-storage/async-storage'

/** Persist and retrieve the last-viewed board ID for a user. */
export async function getLastBoardId(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(`last-board:${userId}`)
}

export async function setLastBoardId(userId: string, boardId: string): Promise<void> {
  await AsyncStorage.setItem(`last-board:${userId}`, boardId)
}

/**
 * Record when a board was last viewed (epoch ms).
 * Used to compute unread/changed indicators on the board list.
 */
export async function setLastViewedAt(userId: string, boardId: string): Promise<void> {
  await AsyncStorage.setItem(`last-viewed:${userId}:${boardId}`, String(Date.now()))
}

/** Returns the last-viewed epoch ms for a board, or null if never viewed. */
export async function getLastViewedAt(userId: string, boardId: string): Promise<number | null> {
  const raw = await AsyncStorage.getItem(`last-viewed:${userId}:${boardId}`)
  if (!raw) return null
  const parsed = parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}
