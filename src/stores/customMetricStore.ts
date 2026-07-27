import { create } from 'zustand'
import type {
  CustomMetric,
  CustomMetricEntry,
  CustomMetricInputKind,
} from '@/domain/customMetric'
import {
  IndexedDbCustomMetricEntryRepository,
  IndexedDbCustomMetricRepository,
} from '@/infrastructure/persistence/indexeddb'

const customMetricRepository = new IndexedDbCustomMetricRepository()
const customMetricEntryRepository = new IndexedDbCustomMetricEntryRepository()

interface CustomMetricStoreState {
  metrics: CustomMetric[]
  entries: CustomMetricEntry[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadAll: () => Promise<void>
  addMetric: (
    name: string,
    inputKind: CustomMetricInputKind,
    unit?: string,
  ) => Promise<void>
  /** Cascades to every logged entry for this metric (#336) — an entry with
   * no surviving metric to belong to is orphaned data, not worth keeping.
   * Callers also need to drop any `CustomCorrelation` referencing this
   * metric (`useCustomCorrelationStore.deleteCorrelationsReferencingMetric`)
   * — a separate store, so this action doesn't know about correlations at
   * all; `CustomMetricsScreen.tsx` calls both. */
  deleteMetric: (id: string) => Promise<void>
  /** Upserts by `(metricId, date)` — looks up any existing entry for that
   * day first and reuses its id, same "find the existing id, carry it
   * over" convention `IndexedDbDailyEntryRepository.getByDate` already
   * established, rather than letting a second log for the same day pile
   * up as a duplicate row. */
  setEntryValue: (metricId: string, date: string, value: number) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
}

export const useCustomMetricStore = create<CustomMetricStoreState>((set) => ({
  metrics: [],
  entries: [],
  status: 'idle',
  error: null,
  loadAll: async () => {
    set({ status: 'loading', error: null })
    try {
      const [metrics, entries] = await Promise.all([
        customMetricRepository.getAll(),
        customMetricEntryRepository.getAll(),
      ])
      set({ metrics, entries, status: 'ready' })
    } catch (err) {
      set({
        status: 'error',
        error:
          err instanceof Error ? err.message : 'Failed to load custom metrics',
      })
    }
  },
  addMetric: async (name, inputKind, unit) => {
    await customMetricRepository.upsert({
      id: crypto.randomUUID(),
      name,
      inputKind,
      unit,
      createdAt: new Date().toISOString(),
    })
    set({ metrics: await customMetricRepository.getAll() })
  },
  deleteMetric: async (id) => {
    await Promise.all([
      customMetricRepository.delete(id),
      customMetricEntryRepository.deleteByMetric(id),
    ])
    const [metrics, entries] = await Promise.all([
      customMetricRepository.getAll(),
      customMetricEntryRepository.getAll(),
    ])
    set({ metrics, entries })
  },
  setEntryValue: async (metricId, date, value) => {
    const existing = await customMetricEntryRepository.getByMetricAndDate(
      metricId,
      date,
    )
    await customMetricEntryRepository.upsert({
      id: existing?.id ?? crypto.randomUUID(),
      metricId,
      date,
      value,
      updatedAt: new Date().toISOString(),
    })
    set({ entries: await customMetricEntryRepository.getAll() })
  },
  deleteEntry: async (id) => {
    await customMetricEntryRepository.delete(id)
    set({ entries: await customMetricEntryRepository.getAll() })
  },
}))
