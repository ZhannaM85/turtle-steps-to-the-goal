import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DashboardChartKey } from './dashboardChartVisibilityStore'

// #297 — the Dashboard's own fixed section order, exactly as
// DashboardScreen.tsx rendered them before this issue. Reuses
// `DashboardChartKey` (dashboardChartVisibilityStore.ts) rather than a
// second parallel key list — same 17 sections either store needs to know
// about, and keeping them as one type avoids the two ever drifting apart.
export const DEFAULT_DASHBOARD_SECTION_ORDER: DashboardChartKey[] = [
  'weight',
  'calories',
  'macros',
  'bodyComposition',
  'customChart',
  'calorieWeightCorrelation',
  'lateMealCorrelation',
  'fastingWindowCorrelation',
  'sleepCorrelation',
  'stepsCorrelation',
  'proteinCorrelation',
  'foodReactions',
  'loggingConsistency',
  'recentAverages',
  'weeklySummary',
  'monthlySummary',
  'compareRanges',
]

interface DashboardSectionOrderState {
  order: DashboardChartKey[]
  setOrder: (order: DashboardChartKey[]) => void
}

/**
 * Persists the drag-and-drop order of Dashboard sections (#297) — a
 * separate store from `dashboardChartVisibilityStore.ts` (whether a
 * section shows at all), same "different concept, different store"
 * reasoning that file's own comment already gives for staying split from
 * `trendChartSeriesStore.ts`.
 */
export const useDashboardSectionOrderStore =
  create<DashboardSectionOrderState>()(
    persist(
      (set) => ({
        order: DEFAULT_DASHBOARD_SECTION_ORDER,
        setOrder: (order) => set({ order }),
      }),
      {
        name: 'turtle-steps-dashboard-section-order',
        storage: createJSONStorage(() => localStorage),
        // A persisted order predates any Dashboard section added (or
        // removed) since it was last saved — reconcile rather than trust
        // it verbatim: drop keys that no longer exist, then append any
        // current key missing from it (a section added after the user's
        // last reorder) at the end, so a new section doesn't silently
        // fail to render just because it's absent from an old save.
        merge: (persisted, current) => {
          const persistedOrder = (persisted as { order?: unknown } | undefined)
            ?.order
          if (!Array.isArray(persistedOrder)) return current
          const known = new Set<DashboardChartKey>(DEFAULT_DASHBOARD_SECTION_ORDER)
          const kept = persistedOrder.filter(
            (key): key is DashboardChartKey =>
              typeof key === 'string' && known.has(key as DashboardChartKey),
          )
          const keptSet = new Set(kept)
          const missing = DEFAULT_DASHBOARD_SECTION_ORDER.filter((key) => !keptSet.has(key))
          return { ...current, order: [...kept, ...missing] }
        },
      },
    ),
  )
