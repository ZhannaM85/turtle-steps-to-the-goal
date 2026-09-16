import { KCAL_PER_KG_FAT } from '@/domain/goal'
import { calculateBmr, type Sex } from './bodyComposition'
import { calculateTdee, type ActivityLevel } from './targetCalculator'

/** #934 — Complete-the-day overlay looks this far ahead. */
export const COMPLETE_DAY_HORIZON_WEEKS = 5
export const COMPLETE_DAY_HORIZON_DAYS = COMPLETE_DAY_HORIZON_WEEKS * 7

/** Skip the 5-week line when today's intake is below half of estimated TDEE. */
export const COMPLETE_DAY_LOW_INTAKE_TDEE_FRACTION = 0.5
/** Skip the 5-week line when today's intake is above 1.5× estimated TDEE. */
export const COMPLETE_DAY_HIGH_INTAKE_TDEE_FRACTION = 1.5
/** #936 — horizontal dashed mesh every 500 g. */
export const COMPLETE_DAY_GRID_KG = 0.5

export function completeDayWeekGridTicks(): number[] {
  return Array.from(
    { length: COMPLETE_DAY_HORIZON_WEEKS + 1 },
    (_, week) => week,
  )
}

export function completeDayWeightGridTicksKg(
  minKg: number,
  maxKg: number,
): number[] {
  const lo = Math.min(minKg, maxKg)
  const hi = Math.max(minKg, maxKg)
  const start =
    Math.floor(lo / COMPLETE_DAY_GRID_KG) * COMPLETE_DAY_GRID_KG
  const end = Math.ceil(hi / COMPLETE_DAY_GRID_KG) * COMPLETE_DAY_GRID_KG
  const ticks: number[] = []
  for (let kg = start; kg <= end + 1e-9; kg += COMPLETE_DAY_GRID_KG) {
    ticks.push(Math.round(kg * 10) / 10)
  }
  if (ticks.length < 2) {
    ticks.push(Math.round((start + COMPLETE_DAY_GRID_KG) * 10) / 10)
  }
  return ticks
}

export interface CompleteDayProjectionInput {
  weightKg: number
  dailyKcal: number
  heightCm: number
  age: number
  sex: Sex
  activityLevel: ActivityLevel
}

export interface CompleteDayProjectionPoint {
  week: number
  weightKg: number
}

export interface CompleteDayProjection {
  tdeeKcal: number
  dailyDeficitKcal: number
  /** Starting weight minus week-5 weight. Positive = lower. */
  totalChangeKg: number
  projectedWeightKg: number
  points: CompleteDayProjectionPoint[]
}

/**
 * #934 — 35-day simulation if every day matched today's calories.
 * Recalculates Mifflin–St Jeor TDEE as weight moves so the line is not a
 * straight `deficit × 35 / 7700` ruler. Not medical advice.
 */
export function projectWeightIfEatingLikeToday(
  input: CompleteDayProjectionInput,
): CompleteDayProjection {
  const startBmr = calculateBmr(
    input.weightKg,
    input.heightCm,
    input.age,
    input.sex,
  )
  const tdeeKcal = Math.round(calculateTdee(startBmr, input.activityLevel))
  let weightKg = input.weightKg
  const points: CompleteDayProjectionPoint[] = [{ week: 0, weightKg }]
  for (let day = 1; day <= COMPLETE_DAY_HORIZON_DAYS; day += 1) {
    const bmr = calculateBmr(weightKg, input.heightCm, input.age, input.sex)
    const tdee = calculateTdee(bmr, input.activityLevel)
    weightKg -= (tdee - input.dailyKcal) / KCAL_PER_KG_FAT
    if (day % 7 === 0) {
      points.push({ week: day / 7, weightKg })
    }
  }
  const projectedWeightKg = points[COMPLETE_DAY_HORIZON_WEEKS]!.weightKg
  return {
    tdeeKcal,
    dailyDeficitKcal: tdeeKcal - input.dailyKcal,
    totalChangeKg: input.weightKg - projectedWeightKg,
    projectedWeightKg,
    points,
  }
}

export type CompleteDayProjectionBlocker =
  | 'missingWeight'
  | 'missingCalories'
  | 'missingProfile'
  | 'unusualLow'
  | 'unusualHigh'

export function completeDayProjectionBlocker(args: {
  weightKg: number | undefined
  dailyKcal: number | undefined
  heightCm: number | undefined
  age: number | undefined
  sex: Sex | undefined
  activityLevel: ActivityLevel | undefined
}): CompleteDayProjectionBlocker | undefined {
  if (
    args.weightKg === undefined ||
    !Number.isFinite(args.weightKg) ||
    args.weightKg <= 0
  ) {
    return 'missingWeight'
  }
  if (args.dailyKcal === undefined) return 'missingCalories'
  if (
    args.heightCm === undefined ||
    args.age === undefined ||
    args.sex === undefined ||
    args.activityLevel === undefined
  ) {
    return 'missingProfile'
  }
  const bmr = calculateBmr(
    args.weightKg,
    args.heightCm,
    args.age,
    args.sex,
  )
  const tdee = calculateTdee(bmr, args.activityLevel)
  if (args.dailyKcal < tdee * COMPLETE_DAY_LOW_INTAKE_TDEE_FRACTION) {
    return 'unusualLow'
  }
  if (args.dailyKcal > tdee * COMPLETE_DAY_HIGH_INTAKE_TDEE_FRACTION) {
    return 'unusualHigh'
  }
  return undefined
}
