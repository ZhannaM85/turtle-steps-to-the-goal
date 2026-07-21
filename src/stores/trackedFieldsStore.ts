import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #237 — which optional daily-tracking fields appear on the Today form.
 * All default `true` (opt-out), unlike `useCycleTrackingStore`/
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

const DEFAULT_TRACKED: Record<TrackedField, boolean> = {
  sleep: true,
  steps: true,
  bodyMeasurements: true,
  note: true,
  mood: true,
  bodyComposition: true,
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
    },
  ),
)
