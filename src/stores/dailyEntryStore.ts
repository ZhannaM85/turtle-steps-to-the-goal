import { create } from 'zustand'
import type { DailyEntry } from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

interface DailyEntryStoreState {
  date: string | null
  entry: DailyEntry | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadEntry: (date: string) => Promise<void>
  saveEntry: (entry: DailyEntry) => Promise<void>
}

export const useDailyEntryStore = create<DailyEntryStoreState>((set) => ({
  date: null,
  entry: null,
  status: 'idle',
  error: null,
  loadEntry: async (date) => {
    set({ status: 'loading', error: null, date })
    try {
      const entry = await dailyEntryRepository.getByDate(date)
      set({ entry: entry ?? null, status: 'ready' })
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load the entry',
      })
    }
  },
  saveEntry: async (entry) => {
    await dailyEntryRepository.upsert(entry)
    set({ entry, date: entry.date, status: 'ready' })
  },
}))
