import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #507 — whether Add meal's Recent suggestions list is shown at all.
 * Same eye-toggle idea as #245/#232 Dashboard/Today section visibility,
 * kept as its own tiny store (one boolean, Add-meal-only) rather than
 * folding into `sectionVisibilityStore` (Today/Goal keys) or the
 * Dashboard chart store.
 */
interface AddMealRecentVisibilityState {
  recentVisible: boolean
  toggleRecentVisible: () => void
}

export const useAddMealRecentVisibilityStore =
  create<AddMealRecentVisibilityState>()(
    persist(
      (set) => ({
        recentVisible: true,
        toggleRecentVisible: () =>
          set((state) => ({ recentVisible: !state.recentVisible })),
      }),
      {
        name: 'turtle-steps-add-meal-recent-visibility',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
