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
 *
 * **#394**: returns `undefined` — not `false` — when there's no override and
 * *no* meal that day has a `timeEaten` at all (not just none of them being
 * late). The original `boolean`-only version silently returned `false` for
 * this "no data" case, which every day imported without per-meal timestamps
 * (the overwhelming majority of a real MyFitnessPal/Apple Health/Zepp Life
 * import — none of those set meal-level `timeEaten`) then hit, inflating
 * `nightEatingCorrelation`'s "No" group with thousands of zero-signal days
 * for a user who had only just started actually tracking this. `undefined`
 * lets every consumer (correlation, toggle UI, calendar dot, exports, chart
 * series) tell "confirmed not eating late" apart from "no idea yet."
 */
export function hadNightEating(entry: NightEatingInput): boolean | undefined {
  if (entry.nightEatingOverride !== undefined) return entry.nightEatingOverride
  const timedMeals = (entry.calorieEntries ?? []).filter(
    (meal) => meal.timeEaten !== undefined,
  )
  if (timedMeals.length === 0) return undefined
  return timedMeals.some((meal) => meal.timeEaten! >= NIGHT_EATING_CUTOFF_HHMM)
}
