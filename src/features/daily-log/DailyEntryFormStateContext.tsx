import { type ReactNode } from 'react'
import { useDailyEntryFormState, type DailyEntryFormProps } from './useDailyEntryFormState'
import { DailyEntryFormStateContext } from './dailyEntryFormStateContextValue'

/**
 * #419 — lets the Morning entries group render in a completely different
 * part of the tree (right after `TodayScreen.tsx`'s Goal target card) from
 * the rest of the form (Meals/Water/Evening, further down, past BMI/the
 * deltas/the reorderable stat-card group), while every consumer still
 * reads/writes the one live `useDailyEntryFormState` instance. `key={date}`
 * belongs on this provider specifically — its call is what needs to reset
 * per day; `useDailyEntryFormState`'s own internal state (`initialValues`/
 * `entryIdentity` memoized with `[]` deps, `isEditingWeight` etc.) only
 * ever resets via a full remount, not by reacting to a changed `date` prop.
 *
 * Split from `useDailyEntryFormStateContext` (the consumer-side hook) into
 * its own file since `react-refresh/only-export-components` flags a file
 * exporting both a component and a plain function — same reasoning
 * `app/lazyRoutes.ts` already documents for its own split.
 */
export function DailyEntryFormStateProvider({
  children,
  ...props
}: DailyEntryFormProps & { children: ReactNode }) {
  const state = useDailyEntryFormState(props)
  return (
    <DailyEntryFormStateContext.Provider value={state}>
      {children}
    </DailyEntryFormStateContext.Provider>
  )
}
