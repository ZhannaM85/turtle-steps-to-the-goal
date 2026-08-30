import { create } from 'zustand'
import type { DailyEntry } from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

interface DailyEntryStoreState {
  date: string | null
  entry: DailyEntry | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  /** #783: in-memory only. Bumped only from a successful Day weight
   * save so the complete-week celebration can fire on that save, not on
   * app open / remount. Starts at 0; a full reload resets it. */
  weightSaveGeneration: number
  completeOfferDismissedGeneration: number | null
  loadEntry: (date: string) => Promise<void>
  saveEntry: (entry: DailyEntry) => Promise<void>
  noteWeightSaved: () => void
  dismissCompleteOffer: () => void
}

export const useDailyEntryStore = create<DailyEntryStoreState>((set, get) => ({
  date: null,
  entry: null,
  status: 'idle',
  error: null,
  weightSaveGeneration: 0,
  completeOfferDismissedGeneration: null,
  noteWeightSaved: () =>
    set((state) => ({
      weightSaveGeneration: state.weightSaveGeneration + 1,
    })),
  dismissCompleteOffer: () =>
    set({ completeOfferDismissedGeneration: get().weightSaveGeneration }),
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
