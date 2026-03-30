import { create } from 'zustand'
import type { Task } from '../lib/github'

interface TasksState {
  /** Map of boardId → tasks array */
  tasksByBoard: Record<string, Task[]>
  isLoading: boolean
  error: string | null
  setTasks: (boardId: string, tasks: Task[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearBoard: (boardId: string) => void
}

export const useTasksStore = create<TasksState>((set) => ({
  tasksByBoard: {},
  isLoading: false,
  error: null,
  setTasks: (boardId, tasks) =>
    set((state) => ({
      tasksByBoard: { ...state.tasksByBoard, [boardId]: tasks },
      error: null,
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  clearBoard: (boardId) =>
    set((state) => {
      const next = { ...state.tasksByBoard }
      delete next[boardId]
      return { tasksByBoard: next }
    }),
}))
