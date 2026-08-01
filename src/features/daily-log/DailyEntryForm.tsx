import { DailyEntryFormBottom } from './DailyEntryFormBottom'
import { DailyEntryFormMorning } from './DailyEntryFormMorning'
import { DailyEntryFormStateProvider } from './DailyEntryFormStateContext'
import { DailyEntryFormTop } from './DailyEntryFormTop'
import type { DailyEntryFormProps } from './useDailyEntryFormState'

export type { DailyEntryFormProps } from './useDailyEntryFormState'

/**
 * The combined daily-entry form: Morning group (`DailyEntryFormMorning`),
 * Meals + Water (`DailyEntryFormTop`), then the Evening group
 * (`DailyEntryFormBottom`) — one contiguous block. Used wherever the whole
 * form renders together — History's inline edit (`EntryRow.tsx`) — via a
 * single `DailyEntryFormStateProvider` shared by all three.
 *
 * `TodayScreen.tsx` does **not** use this component — #419 moved
 * `DailyEntryFormMorning` to render right after the Goal target card there
 * (before BMI/the deltas/the reorderable stat-card group), and #416 moved
 * the Evening group to render after `CustomMetricLogSection` — so it wraps
 * its own `DailyEntryFormStateProvider` around all of that and renders each
 * piece where it belongs directly. Both call sites share the same state
 * shape, so e.g. the Evening group's night-eating toggle always sees the
 * same live `calorieEntries` the Meals section (`DailyEntryFormTop`) edits,
 * regardless of which layout is used.
 */
export function DailyEntryForm(props: DailyEntryFormProps) {
  return (
    <DailyEntryFormStateProvider {...props}>
      {/* #510 — match Today's form-area `gap-6` so History's combined
       * Morning / Top / Bottom shells share the same rhythm. */}
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
        <DailyEntryFormMorning />
        <DailyEntryFormTop />
        <DailyEntryFormBottom />
      </form>
    </DailyEntryFormStateProvider>
  )
}
