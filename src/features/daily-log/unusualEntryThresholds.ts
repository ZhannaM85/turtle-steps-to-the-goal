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

/**
 * #401 — a *relative* sanity check, distinct from `isUnusualWeightKg`'s
 * absolute plausibility band above: a value can sit comfortably inside that
 * band (e.g. 60kg -> 75kg) while still being an implausible overnight swing
 * for one person. Tolerance is the larger of a flat floor (so normal
 * day-to-day noise near a low value isn't flagged) or a percentage of the
 * previous value (so a proportionally bigger swing is allowed for someone
 * heavier/leaner to begin with) — same "larger of floor or percentage"
 * shape `isInconsistentMacros` above already established. Static, not
 * adjusted for how many days have actually passed since the previous
 * entry (a real gap between logged days would make a bigger swing
 * unremarkable) — a known simplification, not attempted here.
 */
function isUnusualDelta(
  current: number,
  previous: number,
  minAbsoluteDelta: number,
  percentOfPrevious: number,
): boolean {
  const tolerance = Math.max(
    minAbsoluteDelta,
    Math.abs(previous) * percentOfPrevious,
  )
  return Math.abs(current - previous) > tolerance
}

export const UNUSUAL_WEIGHT_DELTA_MIN_KG = 3
export const UNUSUAL_WEIGHT_DELTA_RATIO = 0.05

export function isUnusualWeightDeltaKg(
  currentKg: number,
  previousKg: number,
): boolean {
  return isUnusualDelta(
    currentKg,
    previousKg,
    UNUSUAL_WEIGHT_DELTA_MIN_KG,
    UNUSUAL_WEIGHT_DELTA_RATIO,
  )
}

export const UNUSUAL_MUSCLE_MASS_DELTA_MIN_KG = 2
export const UNUSUAL_MUSCLE_MASS_DELTA_RATIO = 0.1

export function isUnusualMuscleMassDeltaKg(
  currentKg: number,
  previousKg: number,
): boolean {
  return isUnusualDelta(
    currentKg,
    previousKg,
    UNUSUAL_MUSCLE_MASS_DELTA_MIN_KG,
    UNUSUAL_MUSCLE_MASS_DELTA_RATIO,
  )
}

export const UNUSUAL_BONE_MASS_DELTA_MIN_KG = 0.3
export const UNUSUAL_BONE_MASS_DELTA_RATIO = 0.1

export function isUnusualBoneMassDeltaKg(
  currentKg: number,
  previousKg: number,
): boolean {
  return isUnusualDelta(
    currentKg,
    previousKg,
    UNUSUAL_BONE_MASS_DELTA_MIN_KG,
    UNUSUAL_BONE_MASS_DELTA_RATIO,
  )
}

export const UNUSUAL_VISCERAL_FAT_DELTA_MIN = 2
export const UNUSUAL_VISCERAL_FAT_DELTA_RATIO = 0.2

export function isUnusualVisceralFatDelta(
  current: number,
  previous: number,
): boolean {
  return isUnusualDelta(
    current,
    previous,
    UNUSUAL_VISCERAL_FAT_DELTA_MIN,
    UNUSUAL_VISCERAL_FAT_DELTA_RATIO,
  )
}

export const UNUSUAL_BODY_FAT_PERCENT_DELTA_MIN = 3
export const UNUSUAL_BODY_FAT_PERCENT_DELTA_RATIO = 0.15

export function isUnusualBodyFatPercentDelta(
  current: number,
  previous: number,
): boolean {
  return isUnusualDelta(
    current,
    previous,
    UNUSUAL_BODY_FAT_PERCENT_DELTA_MIN,
    UNUSUAL_BODY_FAT_PERCENT_DELTA_RATIO,
  )
}

export const UNUSUAL_BODY_WATER_PERCENT_DELTA_MIN = 3
export const UNUSUAL_BODY_WATER_PERCENT_DELTA_RATIO = 0.1

export function isUnusualBodyWaterPercentDelta(
  current: number,
  previous: number,
): boolean {
  return isUnusualDelta(
    current,
    previous,
    UNUSUAL_BODY_WATER_PERCENT_DELTA_MIN,
    UNUSUAL_BODY_WATER_PERCENT_DELTA_RATIO,
  )
}

/**
 * #401 follow-up — absolute plausibility bounds for body composition fields,
 * analogous to `isUnusualWeightKg`'s 35-250kg band. These catch typos with
 * wildly impossible values (7888kg muscle, 478% water, etc.) even when
 * there's no prior entry to compare delta against.
 */
export const MUSCLE_MASS_PLAUSIBLE_MAX_KG = 100
export const MUSCLE_MASS_PLAUSIBLE_MIN_KG = 0

export function isUnusualMuscleMassKg(muscleMassKg: number): boolean {
  return (
    muscleMassKg < MUSCLE_MASS_PLAUSIBLE_MIN_KG ||
    muscleMassKg > MUSCLE_MASS_PLAUSIBLE_MAX_KG
  )
}

export const VISCERAL_FAT_PLAUSIBLE_MAX = 20
export const VISCERAL_FAT_PLAUSIBLE_MIN = 0

export function isUnusualVisceralFat(visceralFat: number): boolean {
  return (
    visceralFat < VISCERAL_FAT_PLAUSIBLE_MIN ||
    visceralFat > VISCERAL_FAT_PLAUSIBLE_MAX
  )
}

export const BODY_WATER_PERCENT_PLAUSIBLE_MAX = 100
export const BODY_WATER_PERCENT_PLAUSIBLE_MIN = 0

export function isUnusualBodyWaterPercent(bodyWaterPercent: number): boolean {
  return (
    bodyWaterPercent < BODY_WATER_PERCENT_PLAUSIBLE_MIN ||
    bodyWaterPercent > BODY_WATER_PERCENT_PLAUSIBLE_MAX
  )
}

export const BONE_MASS_PLAUSIBLE_MAX_KG = 30
export const BONE_MASS_PLAUSIBLE_MIN_KG = 0

export function isUnusualBoneMassKg(boneMassKg: number): boolean {
  return (
    boneMassKg < BONE_MASS_PLAUSIBLE_MIN_KG ||
    boneMassKg > BONE_MASS_PLAUSIBLE_MAX_KG
  )
}

export const BODY_FAT_PERCENT_PLAUSIBLE_MAX = 100
export const BODY_FAT_PERCENT_PLAUSIBLE_MIN = 0

export function isUnusualBodyFatPercent(bodyFatPercent: number): boolean {
  return (
    bodyFatPercent < BODY_FAT_PERCENT_PLAUSIBLE_MIN ||
    bodyFatPercent > BODY_FAT_PERCENT_PLAUSIBLE_MAX
  )
}
