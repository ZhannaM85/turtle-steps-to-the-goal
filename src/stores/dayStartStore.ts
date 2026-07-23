import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface DayStartStoreState {
  /** 'HH:MM', 24-hour. Default '00:00' (midnight) is exactly today's
   * existing behavior — a user who never opens this setting sees no
   * change at all. Forward-only (#298, resolved via `AskUserQuestion`):
   * changing it only affects which day *new* entries land on, not a
   * retroactive re-bucketing of already-logged history. */
  dayStartTime: string
  setDayStartTime: (dayStartTime: string) => void
}

/**
 * #298 — lets the user push "today" 's boundary later than midnight, for
 * anyone up past midnight who doesn't want that logged against the next
 * calendar day. First-pass scope (resolved via `AskUserQuestion`): only
 * `TodayScreen.tsx`'s own date resolution reads this so far — streaks,
 * weekly/monthly summaries, correlation day-pairing, and the fasting-
 * window toast still use the real calendar date, left for a follow-up
 * issue rather than reworked all at once.
 */
export const useDayStartStore = create<DayStartStoreState>()(
  persist(
    (set) => ({
      dayStartTime: '00:00',
      setDayStartTime: (dayStartTime) => set({ dayStartTime }),
    }),
    {
      name: 'turtle-steps-day-start',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
