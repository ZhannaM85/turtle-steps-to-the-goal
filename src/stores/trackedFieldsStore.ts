import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #237 — which optional daily-tracking fields appear on the Today form.
 * Most default `true` (opt-out), unlike `useCycleTrackingStore`/
 * `useDigestionTrackingStore` (opt-in, off by default) — those two keep
 * their own separate stores/localStorage keys unchanged (real data
 * already in production; a merge would need a migration for no real
 * benefit) but render together with these in one unified Settings
 * section. Turning a field off only hides its input going forward —
 * already-logged data for it is untouched and still shows in
 * History/Dashboard/Export.
 */
export type TrackedField =
  | 'sleep'
  | 'steps'
  | 'bodyMeasurements'
  | 'note'
  | 'mood'
  | 'bodyComposition'
  | 'nightEating'
  | 'dayTotals'
  | 'fiber'

const DEFAULT_TRACKED: Record<TrackedField, boolean> = {
  sleep: true,
  steps: true,
  bodyMeasurements: true,
  note: true,
  mood: true,
  // #528 — smart-scale fields stay opt-in for new users (existing
  // persisted prefs keep whatever they already saved).
  bodyComposition: false,
  // #532 — was always-on (#383); default on so existing behavior stays
  // until the user opts out in Settings.
  nightEating: true,
  // #575 — #549 day-level totals; default on (opt-out) so current Day UI
  // stays until the user hides it in What to track.
  dayTotals: true,
  // #582 — meal + day-totals fiber and Today's remaining-fiber card were
  // always-on since #341; default on so existing behavior stays until the
  // user opts out. #590 — Goal's daily fiber target uses the same gate.
  fiber: true,
}

interface TrackedFieldsState {
  tracked: Record<TrackedField, boolean>
  setTracked: (field: TrackedField, value: boolean) => void
}

export const useTrackedFieldsStore = create<TrackedFieldsState>()(
  persist(
    (set) => ({
      tracked: DEFAULT_TRACKED,
      setTracked: (field, value) =>
        set((state) => ({
          tracked: { ...state.tracked, [field]: value },
        })),
    }),
    {
      name: 'turtle-steps-tracked-fields',
      storage: createJSONStorage(() => localStorage),
      // Fill keys added after a user's first visit (e.g. #532 nightEating)
      // from DEFAULT_TRACKED so missing keys don't read as "off".
      merge: (persisted, current) => {
        const p = persisted as Partial<TrackedFieldsState> | undefined
        return {
          ...current,
          ...p,
          tracked: {
            ...DEFAULT_TRACKED,
            ...p?.tracked,
          },
        }
      },
    },
  ),
)
