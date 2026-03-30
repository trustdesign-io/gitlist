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
  /** Prepend a task to the top of a board's list (used for optimistic adds). */
  prependTask: (boardId: string, task: Task) => void
  /** Remove a task by ID from a board's list (used for optimistic rollback). */
  removeTask: (boardId: string, taskId: string) => void
  /** Replace a task by ID in a board's list (used to swap optimistic → real task). */
  replaceTask: (boardId: string, oldId: string, newTask: Task) => void
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
  prependTask: (boardId, task) =>
    set((state) => ({
      tasksByBoard: {
        ...state.tasksByBoard,
        [boardId]: [task, ...(state.tasksByBoard[boardId] ?? [])],
      },
    })),
  removeTask: (boardId, taskId) =>
    set((state) => ({
      tasksByBoard: {
        ...state.tasksByBoard,
        [boardId]: (state.tasksByBoard[boardId] ?? []).filter((t) => t.id !== taskId),
      },
    })),
  replaceTask: (boardId, oldId, newTask) =>
    set((state) => ({
      tasksByBoard: {
        ...state.tasksByBoard,
        [boardId]: (state.tasksByBoard[boardId] ?? []).map((t) => (t.id === oldId ? newTask : t)),
      },
    })),
}))
