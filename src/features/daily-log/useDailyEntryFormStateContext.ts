import { useContext } from 'react'
import { DailyEntryFormStateContext } from './dailyEntryFormStateContextValue'
import type { DailyEntryFormState } from './useDailyEntryFormState'

export function useDailyEntryFormStateContext(): DailyEntryFormState {
  const state = useContext(DailyEntryFormStateContext)
  if (!state) {
    throw new Error(
      'useDailyEntryFormStateContext must be used within a DailyEntryFormStateProvider',
    )
  }
  return state
}
