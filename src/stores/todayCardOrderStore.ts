import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// #343 — the reorderable subset of Today's stat cards: the six existing
// "remaining X" cards plus the two new Steps/Sleep cards this issue adds.
// Deliberately narrower than every section on the page (the weekly-target
// card, vs-yesterday/vs-max-weight deltas, BMI, and the banners are left
// at their current fixed positions) — these eight are the coherent group
// of plain "today's numbers at a glance" tiles the request was actually
// about, not a full page-wide reorder system.
export type TodayCardKey =
  | 'remainingCalories'
  | 'remainingProtein'
  | 'remainingFat'
  | 'remainingCarbs'
  | 'remainingFiber'
  | 'remainingWater'
  | 'steps'
  | 'sleep'

export const DEFAULT_TODAY_CARD_ORDER: TodayCardKey[] = [
  'remainingCalories',
  'remainingProtein',
  'remainingFat',
  'remainingCarbs',
  'remainingFiber',
  'remainingWater',
  'steps',
  'sleep',
]

interface TodayCardOrderState {
  order: TodayCardKey[]
  setOrder: (order: TodayCardKey[]) => void
}

/**
 * Persists the drag-and-drop order of Today's reorderable stat cards
 * (#343) — same shape/reasoning as `dashboardSectionOrderStore.ts`'s #297
 * mechanism, a separate store from `sectionVisibilityStore.ts` (whether a
 * card shows at all).
 */
export const useTodayCardOrderStore = create<TodayCardOrderState>()(
  persist(
    (set) => ({
      order: DEFAULT_TODAY_CARD_ORDER,
      setOrder: (order) => set({ order }),
    }),
    {
      name: 'turtle-steps-today-card-order',
      storage: createJSONStorage(() => localStorage),
      // Same reconciliation as dashboardSectionOrderStore.ts: a persisted
      // order predates any card added/removed since it was last saved, so
      // drop unknown keys then append any current key missing from it
      // (e.g. steps/sleep, brand new here) at the end.
      merge: (persisted, current) => {
        const persistedOrder = (persisted as { order?: unknown } | undefined)
          ?.order
        if (!Array.isArray(persistedOrder)) return current
        const known = new Set<TodayCardKey>(DEFAULT_TODAY_CARD_ORDER)
        const kept = persistedOrder.filter(
          (key): key is TodayCardKey =>
            typeof key === 'string' && known.has(key as TodayCardKey),
        )
        const keptSet = new Set(kept)
        const missing = DEFAULT_TODAY_CARD_ORDER.filter(
          (key) => !keptSet.has(key),
        )
        return { ...current, order: [...kept, ...missing] }
      },
    },
  ),
)
