import type { DailyEntry } from './DailyEntry'

/** Only the two fields the derivation actually needs — lets a caller with
 * just-watched form field values (not a full `DailyEntry`) call this
 * directly, e.g. `DailyEntryForm.tsx`'s live toggle display. */
type NightEatingInput = Pick<DailyEntry, 'calorieEntries' | 'nightEatingOverride'>

/** Fixed cutoff hour (24h HH:MM, comparable lexicographically against
 * `CalorieEntry.timeEaten`'s own "HH:MM" format) — any meal logged at or
 * after this counts as night eating for the derived value. Not
 * user-configurable (#383 deliberately keeps this simple; #298's separate
 * day-start-time setting answers a different question — which calendar
 * day a very-early-morning entry belongs to, not when "late" begins). */
const NIGHT_EATING_CUTOFF_HHMM = '21:00'

/**
 * Whether a day counts as "night eating" (#383) — `entry.nightEatingOverride`
 * wins when set (an explicit manual correction), otherwise derived from
 * whether any of that day's logged meals has a `timeEaten` at or after
 * `NIGHT_EATING_CUTOFF_HHMM`. A meal with no recorded time never
 * contributes to the derived value (nothing to compare), but doesn't
 * prevent a *different* meal that day from doing so.
 */
export function hadNightEating(entry: NightEatingInput): boolean {
  if (entry.nightEatingOverride !== undefined) return entry.nightEatingOverride
  return (entry.calorieEntries ?? []).some(
    (meal) =>
      meal.timeEaten !== undefined && meal.timeEaten >= NIGHT_EATING_CUTOFF_HHMM,
  )
}
