/**
 * #218: warns rather than blocks — distinct from `dailyEntryFormSchema.ts`'s
 * existing hard bounds (`weightSchema`'s 20-400kg, `calorieItemSchema`'s
 * per-item 10,000kcal max), which reject a value outright as physically
 * impossible. These are *plausible but unusual* bands entirely inside
 * those hard limits, aimed at the realistic "extra/missing digit" typo —
 * e.g. 320kg still passes the hard max but is still almost certainly a
 * mistake for a human bodyweight entry. Deliberately static thresholds,
 * not compared against the user's own logging history — narrower in scope
 * than that would be, but needs no extra data fetched into the form.
 */
export const UNUSUAL_WEIGHT_MIN_KG = 35
export const UNUSUAL_WEIGHT_MAX_KG = 250

export function isUnusualWeightKg(weightKg: number): boolean {
  return weightKg < UNUSUAL_WEIGHT_MIN_KG || weightKg > UNUSUAL_WEIGHT_MAX_KG
}

/**
 * A day's *total* logged calories, summed across every meal — nothing
 * else checks this today; `calorieItemSchema`'s existing 10,000kcal max
 * only guards a single dish, not the sum of several individually-plausible
 * ones adding up to an implausible day.
 */
export const UNUSUAL_DAILY_CALORIES_KCAL = 6000

export function isUnusualDailyCalories(totalKcal: number): boolean {
  return totalKcal > UNUSUAL_DAILY_CALORIES_KCAL
}
