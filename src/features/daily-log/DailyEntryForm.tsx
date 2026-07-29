import { DailyEntryFormBottom } from './DailyEntryFormBottom'
import { DailyEntryFormTop } from './DailyEntryFormTop'
import {
  useDailyEntryFormState,
  type DailyEntryFormProps,
} from './useDailyEntryFormState'

export type { DailyEntryFormProps } from './useDailyEntryFormState'

/**
 * The combined daily-entry form: Morning group + Meals + Water
 * (`DailyEntryFormTop`) immediately followed by the Evening group
 * (`DailyEntryFormBottom`). Used wherever the whole form renders as one
 * contiguous block — History's inline edit (`EntryRow.tsx`) — via a single
 * `useDailyEntryFormState` call shared by both halves.
 *
 * `TodayScreen.tsx` does **not** use this component — #416 moved the
 * Evening group to render after `CustomMetricLogSection` there, so it
 * calls `useDailyEntryFormState` itself and renders `DailyEntryFormTop`/
 * `DailyEntryFormBottom` directly, with `CustomMetricLogSection` in
 * between. Both call sites share the same state hook, so e.g. the Evening
 * group's night-eating toggle always sees the same live `calorieEntries`
 * the Meals section (in Top) edits, regardless of which layout is used.
 */
export function DailyEntryForm(props: DailyEntryFormProps) {
  const state = useDailyEntryFormState(props)

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      <DailyEntryFormTop state={state} />
      <DailyEntryFormBottom state={state} />
    </form>
  )
}
