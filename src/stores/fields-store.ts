import { create } from 'zustand'
import type { FieldMapping } from '../lib/board-fields'

interface FieldsState {
  /** Map of boardId → field mappings for that board. */
  fieldsByBoard: Record<string, FieldMapping[]>
  setFields: (boardId: string, mappings: FieldMapping[]) => void
}

export const useFieldsStore = create<FieldsState>((set) => ({
  fieldsByBoard: {},
  setFields: (boardId, mappings) =>
    set((state) => ({
      fieldsByBoard: { ...state.fieldsByBoard, [boardId]: mappings },
    })),
}))
