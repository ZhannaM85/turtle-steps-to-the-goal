/**
 * #548 — arithmetic daily water volume recommendation from body weight.
 * Not medical advice; ml/kg band is a common public rule of thumb.
 * Optional bumps are caller-supplied flags (no weather API).
 */

/** Lower end of the recommended band (ml per kg body weight). */
export const WATER_ML_PER_KG_LOW = 30
/** Upper end of the recommended band (ml per kg body weight). */
export const WATER_ML_PER_KG_HIGH = 40
/** Extra ml when the user marks a hot day. */
export const WATER_HOT_DAY_BUMP_ML = 300
/** Extra ml when the user marks a workout day. */
export const WATER_WORKOUT_BUMP_ML = 500

export interface WaterRecommendationRange {
  lowMl: number
  highMl: number
}

export interface WaterRecommendationAdjustments {
  hotDay?: boolean
  afterWorkout?: boolean
}

function roundToNearest50(ml: number): number {
  return Math.round(ml / 50) * 50
}

/**
 * Base recommended daily water range from weight (kg), before optional bumps.
 */
export function recommendedWaterMlRange(weightKg: number): WaterRecommendationRange {
  if (!(weightKg > 0) || !Number.isFinite(weightKg)) {
    return { lowMl: 0, highMl: 0 }
  }
  return {
    lowMl: roundToNearest50(weightKg * WATER_ML_PER_KG_LOW),
    highMl: roundToNearest50(weightKg * WATER_ML_PER_KG_HIGH),
  }
}

/**
 * Applies optional user-flagged bumps to both ends of the range.
 */
export function adjustWaterMlRange(
  base: WaterRecommendationRange,
  adjustments: WaterRecommendationAdjustments = {},
): WaterRecommendationRange {
  let bump = 0
  if (adjustments.hotDay) bump += WATER_HOT_DAY_BUMP_ML
  if (adjustments.afterWorkout) bump += WATER_WORKOUT_BUMP_ML
  return {
    lowMl: base.lowMl + bump,
    highMl: base.highMl + bump,
  }
}

/** Midpoint of a range, useful as a soft fill for `dailyWaterTargetMl`. */
export function waterRecommendationMidMl(range: WaterRecommendationRange): number {
  return roundToNearest50((range.lowMl + range.highMl) / 2)
}
