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
 * calendar day. First shipped scoped to just `TodayScreen.tsx`'s own date
 * resolution; #601 (resolved via `AskUserQuestion`: shift analytics
 * forward too, forward-only — no retroactive re-bucketing of already-
 * logged history) extended it to the late-meal/fasting-window
 * correlations and chart series, and to "is this week still in progress"
 * (Dashboard's weekly recap, the calorie/weight correlation, Goal's
 * weekly review). Dashboard's other rolling-window displays (recent
 * averages, logging-consistency heatmap, trend-chart period pager) still
 * use the real calendar date as of #601 — a smaller, lower-stakes gap
 * left for a further follow-up rather than reworked all at once.
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
