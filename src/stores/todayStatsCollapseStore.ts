import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface TodayStatsCollapseState {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

/**
 * Persists whether Today's BMI/vs-yesterday/vs-max-weight/reorderable
 * stat-card group (#418) is collapsed — expanded (`false`) by default, so a
 * first-time user sees everything same as before this existed. Deliberately
 * persisted (unlike a plain `useState`) rather than resetting to expanded on
 * every visit — collapsing it once is meant to stick, not be redone daily.
 * A separate store from `sectionVisibilityStore.ts` (whether a card shows
 * at all) and `todayCardOrderStore.ts` (drag order within the group) — this
 * only ever toggles one shared collapsed/expanded flag for the whole block.
 */
export const useTodayStatsCollapseStore = create<TodayStatsCollapseState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: 'turtle-steps-today-stats-collapse',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
