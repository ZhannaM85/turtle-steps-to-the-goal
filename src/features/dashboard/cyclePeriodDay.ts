// #615 — whether `date` is itself a logged period day, no days-before/after
// window. Two windowed attempts (10-day, then 5-day radius) both kept
// surfacing the cycle/weight note on days with no real connection to a
// logged period — reported live both times as reading like a stray
// prediction rather than the plain fact this note is meant to state. An
// exact-day check has no magic-number threshold to get wrong: the note
// only ever appears when the day actually being looked at is itself marked
// on-period.
export function isLoggedPeriodDay(date: string, periodDates: string[]): boolean {
  return periodDates.includes(date)
}
