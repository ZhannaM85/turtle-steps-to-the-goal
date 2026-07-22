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

/**
 * #255 — a single item's own internal consistency (entered kcal vs. the
 * standard 4/9/4 kcal-per-gram estimate from its own protein/fat/carbs),
 * one level down from `isUnusualDailyCalories`'s day-total plausibility
 * check. Only runs once all three macros are entered — most items only
 * carry a subset (e.g. kcal + protein alone), and treating a missing macro
 * as 0 would flag nearly every normal partial entry as "inconsistent."
 * Tolerance is the larger of a flat floor (so small items aren't flagged
 * over ordinary label-rounding) or a percentage of the entered kcal (so
 * large items get a proportionally wider band) — real nutrition labels
 * routinely diverge from the strict formula (fiber, sugar alcohols,
 * rounding) without being a typo.
 */
export const MACRO_MISMATCH_TOLERANCE_RATIO = 0.2
export const MACRO_MISMATCH_MIN_TOLERANCE_KCAL = 30

export function isInconsistentMacros(
  kcal: number,
  proteinG: number | undefined,
  fatG: number | undefined,
  carbsG: number | undefined,
): boolean {
  if (proteinG === undefined || fatG === undefined || carbsG === undefined) {
    return false
  }
  const derivedKcal = proteinG * 4 + fatG * 9 + carbsG * 4
  const tolerance = Math.max(
    MACRO_MISMATCH_MIN_TOLERANCE_KCAL,
    kcal * MACRO_MISMATCH_TOLERANCE_RATIO,
  )
  return Math.abs(kcal - derivedKcal) > tolerance
}
