// Rough, non-medical approximation: ~7700 kcal per kg of body fat.
const KCAL_PER_KG_FAT = 7700

/**
 * Rough estimate of the average daily calorie deficit implied by a weekly
 * kg pace. Arithmetic only — not medical or nutritional advice.
 */
export function estimatedDailyCalorieDeficitKcal(
  targetWeeklyLossKg: number,
): number {
  return (targetWeeklyLossKg * KCAL_PER_KG_FAT) / 7
}
