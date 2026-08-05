import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface CustomMetricNoteDismissalState {
  /** `${metricId}:${date}` keys the user has explicitly closed the empty
   * note editor for (#622) — without this, `MetricValueRow`'s "start in
   * edit mode for an unsaved note" (#364) had no way to tell "never
   * touched" apart from "explicitly canceled once already," since both
   * leave the underlying `note` as `undefined`. That made Cancel (#619)
   * look like it did nothing: the editor reopened on the next remount
   * (date navigation, the section's accordion collapsing/reopening, tab
   * switches), because the initial `isEditingNote` state was recomputed
   * from `note` alone every time. */
  dismissed: Record<string, true>
  dismiss: (key: string) => void
}

export const useCustomMetricNoteDismissalStore =
  create<CustomMetricNoteDismissalState>()(
    persist(
      (set) => ({
        dismissed: {},
        dismiss: (key) =>
          set((state) => ({
            dismissed: { ...state.dismissed, [key]: true },
          })),
      }),
      {
        name: 'turtle-steps-custom-metric-note-dismissal',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
