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
