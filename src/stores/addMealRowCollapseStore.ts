import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AddMealRowCollapseState {
  /** The date (YYYY-MM-DD) *today's* add-row is currently collapsed for,
   * or null when expanded. Storing a single date (not a per-date map) is
   * enough since this only ever applies to today (#201) — a stored date
   * that no longer matches the real "today" is simply stale and reads as
   * "not collapsed", which is exactly the "a new day starts fresh" reset
   * the feature wants, with no separate expiry logic needed. */
  collapsedDate: string | null
  setCollapsed: (date: string, collapsed: boolean) => void
}

/**
 * Persists whether the "add a new meal" row is collapsed for *today*
 * specifically (#201, replacing #199's plain-component-state version) —
 * #199 reset on any remount, not just a new day, which included MealList
 * remounting for reasons that aren't a new day at all (a MealEditScreen
 * round trip, switching tabs and back), reading as broken rather than
 * intentional. Past days don't use this store at all — MealList (below)
 * derives their default straight from date comparison instead, no
 * persistence needed there.
 */
export const useAddMealRowCollapseStore = create<AddMealRowCollapseState>()(
  persist(
    (set) => ({
      collapsedDate: null,
      setCollapsed: (date, collapsed) =>
        set({ collapsedDate: collapsed ? date : null }),
    }),
    {
      name: 'turtle-steps-add-meal-row-collapse',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
