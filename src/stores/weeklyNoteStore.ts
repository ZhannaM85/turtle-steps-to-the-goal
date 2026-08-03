import { create } from 'zustand'
import type { WeeklyNote } from '@/domain/weeklyNote'
import { IndexedDbWeeklyNoteRepository } from '@/infrastructure/persistence/indexeddb'

const weeklyNoteRepository = new IndexedDbWeeklyNoteRepository()

interface WeeklyNoteStoreState {
  notesByWeekStart: Record<string, string>
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadAll: () => Promise<void>
  /** Empty/whitespace note deletes the row so empty weeks stay clean. */
  setNote: (weekStart: string, note: string) => Promise<void>
}

function toMap(notes: WeeklyNote[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const note of notes) {
    map[note.weekStart] = note.note
  }
  return map
}

export const useWeeklyNoteStore = create<WeeklyNoteStoreState>((set) => ({
  notesByWeekStart: {},
  status: 'idle',
  error: null,
  loadAll: async () => {
    set({ status: 'loading', error: null })
    try {
      const notes = await weeklyNoteRepository.getAll()
      set({ notesByWeekStart: toMap(notes), status: 'ready' })
    } catch (err) {
      set({
        status: 'error',
        error:
          err instanceof Error ? err.message : 'Failed to load weekly notes',
      })
    }
  },
  setNote: async (weekStart, note) => {
    const trimmed = note.trim()
    if (!trimmed) {
      await weeklyNoteRepository.delete(weekStart)
    } else {
      await weeklyNoteRepository.upsert({
        weekStart,
        note: trimmed,
        updatedAt: new Date().toISOString(),
      })
    }
    const notes = await weeklyNoteRepository.getAll()
    set({ notesByWeekStart: toMap(notes) })
  },
}))
