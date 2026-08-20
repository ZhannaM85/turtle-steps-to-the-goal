import { format } from 'date-fns'

/**
 * #298 — resolves which calendar date "now" belongs to when the user has
 * configured a day-start time other than midnight (e.g. "up past midnight
 * and don't want that logged against the next calendar day"). Before the
 * configured start time, `now` still belongs to the *previous* calendar
 * day; at or after it, `now` belongs to the real calendar day — resolved
 * via `AskUserQuestion` when this was scoped (the other option floated was
 * treating that gap as already the new day, which is the less common
 * framing of "when does my day start").
 *
 * `dayStartTime` is `'HH:MM'`, defaulting to `'00:00'` (midnight) —
 * exactly today's existing behavior, so a user who never touches the new
 * setting sees no change at all.
 */
export function effectiveDateFor(now: Date, dayStartTime: string): Date {
  const [startHours, startMinutes] = dayStartTime.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutesTotal = startHours * 60 + startMinutes
  if (nowMinutes >= startMinutesTotal) return now
  const previousDay = new Date(now)
  previousDay.setDate(previousDay.getDate() - 1)
  return previousDay
}

/**
 * #601 — the day-start-adjusted ISO date for "today," for every analytics
 * path that needs to know "is this week/period still in progress" the same
 * way the Day screen's own `TodayScreen.tsx` (`todayIso()`) already does.
 * Thin wrapper over `effectiveDateFor` + formatting, so callers (Dashboard
 * weekly recap, correlation "current week" gating, rolling-window
 * averages, etc.) don't each reimplement the `format(effectiveDateFor(...))`
 * pair.
 */
export function todayIsoForDayStart(
  dayStartTime: string,
  now: Date = new Date(),
): string {
  return format(effectiveDateFor(now, dayStartTime), 'yyyy-MM-dd')
}

/**
 * Latest clock time treated as a late-night tail when shifting for
 * day-start. Breakfasts at or after this stay morning even if Settings
 * day-start is later — #755/#756: "Start today's log now" (#345) files an
 * 08:27 meal onto a day whose cutoff is 09:00/10:00; wrapping that
 * breakfast as if it were 01:22 put it after 11:00 and added 24h to the
 * fasting window.
 */
export const OVERNIGHT_WRAP_BEFORE_MINUTES = 6 * 60

/**
 * #298/#621/#601 — a clock time before the day-start cutoff reads as *late*
 * (the tail of the previous logical day), not early: shifting it forward by
 * a full day restores its true chronological position relative to that
 * day's other times, regardless of which calendar day's record happens to
 * hold it. `dayStartMinutes`/the returned value are both plain minutes
 * since midnight. Previously duplicated (unexported) in both
 * `domain/stats/fastingWindow.ts` and `shared/lib/mealLabel.ts` — the
 * latter couldn't import from `domain/stats` without risking a cycle back
 * through `fastingWindow.ts`'s own `effectiveTimeEaten` import from
 * `mealLabel.ts`; importing this file specifically (not the `domain/stats`
 * barrel) avoids that, since `dayStart.ts` itself imports nothing from
 * either.
 *
 * #755 — wrap only late-night hours (before 06:00 *and* before day-start).
 * A 04:00 cutoff is unchanged (#621). A 10:00 cutoff still wraps 01:22,
 * but not 08:27.
 */
export function adjustForDayStart(
  minutes: number,
  dayStartMinutes: number,
): number {
  const wrapBefore = Math.min(dayStartMinutes, OVERNIGHT_WRAP_BEFORE_MINUTES)
  return minutes < wrapBefore ? minutes + 24 * 60 : minutes
}
