import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Per-view, tap-to-exclude outlier state (#224) — a flagged point
 * (`domain/stats/outlierDetection.ts`) can be tapped to drop it from that
 * one view's own correlation math (a suspected vacation/illness week),
 * without affecting any other correlation view or any other part of the
 * app. Keyed by `viewKey` (one per correlation view, e.g. `'sleep'`) then
 * `pointKey` (that view's own stable per-point identifier, usually a
 * date) — a plain nested `Record`, not a `Set`, since `Set` doesn't
 * round-trip through `JSON.stringify` the way `persist` needs.
 */
interface OutlierExclusionState {
  excluded: Record<string, Record<string, true>>
  toggleExcluded: (viewKey: string, pointKey: string) => void
}

export const useOutlierExclusionStore = create<OutlierExclusionState>()(
  persist(
    (set) => ({
      excluded: {},
      toggleExcluded: (viewKey, pointKey) =>
        set((state) => {
          const forView = { ...(state.excluded[viewKey] ?? {}) }
          if (forView[pointKey]) {
            delete forView[pointKey]
          } else {
            forView[pointKey] = true
          }
          return { excluded: { ...state.excluded, [viewKey]: forView } }
        }),
    }),
    {
      name: 'turtle-steps-outlier-exclusion',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
