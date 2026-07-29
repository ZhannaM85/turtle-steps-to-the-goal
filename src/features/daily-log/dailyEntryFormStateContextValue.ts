import { createContext } from 'react'
import type { DailyEntryFormState } from './useDailyEntryFormState'

/** Plain context object — see `DailyEntryFormStateContext.tsx` (the
 * provider) and `useDailyEntryFormStateContext.ts` (the consumer hook) for
 * why this lives in its own file. */
export const DailyEntryFormStateContext =
  createContext<DailyEntryFormState | null>(null)
