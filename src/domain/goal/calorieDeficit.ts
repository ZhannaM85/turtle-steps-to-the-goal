// Rough, non-medical approximation: ~7700 kcal per kg of body fat.
const KCAL_PER_KG_FAT = 7700

/** #529 — ± control step on the weekly-pace field (~100 g). */
export const WEEKLY_PACE_STEP_KG = 0.1

/**
 * #529 — soft-warn (still savable) when the weekly pace implies a very large
 * daily deficit. 1 kg/week ≈ ~1100 kcal/day with the estimate below.
 */
export const WEEKLY_PACE_SOFT_WARN_KG = 1

/**
 * Rough estimate of the average daily calorie deficit implied by a weekly
 * kg pace. Arithmetic only — not medical or nutritional advice.
 */
export function estimatedDailyCalorieDeficitKcal(
  targetWeeklyLossKg: number,
): number {
  return (targetWeeklyLossKg * KCAL_PER_KG_FAT) / 7
}
