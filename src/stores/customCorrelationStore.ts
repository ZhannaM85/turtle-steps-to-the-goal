import { create } from 'zustand'
import type { CustomCorrelation, MetricRef } from '@/domain/customMetric'
import { IndexedDbCustomCorrelationRepository } from '@/infrastructure/persistence/indexeddb'

const customCorrelationRepository = new IndexedDbCustomCorrelationRepository()

function refsMatch(a: MetricRef, b: MetricRef): boolean {
  if (a.kind !== b.kind) return false
  return a.kind === 'builtin' && b.kind === 'builtin'
    ? a.key === b.key
    : a.kind === 'custom' && b.kind === 'custom'
      ? a.metricId === b.metricId
      : false
}

interface CustomCorrelationStoreState {
  correlations: CustomCorrelation[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadCorrelations: () => Promise<void>
  addCorrelation: (
    name: string | undefined,
    metricA: MetricRef,
    metricB: MetricRef,
  ) => Promise<void>
  deleteCorrelation: (id: string) => Promise<void>
  /** Cascades a `CustomMetric`'s own deletion (#336) — a correlation with
   * one side pointing at a metric that no longer exists has nothing left
   * to show, so it's removed rather than left dangling. Called by
   * `CustomMetricsScreen.tsx` alongside `useCustomMetricStore.deleteMetric`,
   * not from within that store — these are two separate collections. */
  deleteCorrelationsReferencingMetric: (metricId: string) => Promise<void>
}

export const useCustomCorrelationStore = create<CustomCorrelationStoreState>(
  (set, get) => ({
    correlations: [],
    status: 'idle',
    error: null,
    loadCorrelations: async () => {
      set({ status: 'loading', error: null })
      try {
        const correlations = await customCorrelationRepository.getAll()
        set({ correlations, status: 'ready' })
      } catch (err) {
        set({
          status: 'error',
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load custom correlations',
        })
      }
    },
    addCorrelation: async (name, metricA, metricB) => {
      await customCorrelationRepository.upsert({
        id: crypto.randomUUID(),
        name,
        metricA,
        metricB,
        createdAt: new Date().toISOString(),
      })
      set({ correlations: await customCorrelationRepository.getAll() })
    },
    deleteCorrelation: async (id) => {
      await customCorrelationRepository.delete(id)
      set({ correlations: await customCorrelationRepository.getAll() })
    },
    deleteCorrelationsReferencingMetric: async (metricId) => {
      const ref: MetricRef = { kind: 'custom', metricId }
      const toDelete = get().correlations.filter(
        (c) => refsMatch(c.metricA, ref) || refsMatch(c.metricB, ref),
      )
      await Promise.all(
        toDelete.map((c) => customCorrelationRepository.delete(c.id)),
      )
      set({ correlations: await customCorrelationRepository.getAll() })
    },
  }),
)
