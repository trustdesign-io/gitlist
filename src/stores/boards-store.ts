import { create } from 'zustand'
import type { Board } from '../lib/github'

interface BoardsState {
  boards: Board[]
  isLoading: boolean
  error: string | null
  lastFetchedAt: number | null
  setBoards: (boards: Board[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useBoardsStore = create<BoardsState>((set) => ({
  boards: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,
  setBoards: (boards) => set({ boards, lastFetchedAt: Date.now(), error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
}))
