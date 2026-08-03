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
  /**
   * #539 / #345 — real calendar ISO date (`yyyy-MM-dd`) for which the user
   * tapped "Start today's log now." While this equals today's real calendar
   * date, `todayIso()` treats that calendar day as "today" even before
   * `dayStartTime`. Stale values for past dates are ignored automatically.
   */
  startedEarlyForDate: string | null
  startTodayEarly: (isoDate: string) => void
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
      startedEarlyForDate: null,
      startTodayEarly: (isoDate) => set({ startedEarlyForDate: isoDate }),
    }),
    {
      name: 'turtle-steps-day-start',
      storage: createJSONStorage(() => localStorage),
      // Older persisted blobs only had dayStartTime — merge keeps defaults
      // for the new #539 field without a version bump.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<DayStartStoreState>),
      }),
    },
  ),
)
