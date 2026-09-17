import { addDays, format, parseISO } from 'date-fns'
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
/** #946/#947 — same 7-day companion window as the About/Dashboard weight trend. */
export const COMPLETE_DAY_TREND_WINDOW_DAYS = 7
/** #947 — typical morning-scale wobble around the projected trend, in kg. */
export const COMPLETE_DAY_OSCILLATION_KG = 0.4

export function completeDayWeekGridTicks(): number[] {
  return Array.from(
    { length: COMPLETE_DAY_HORIZON_WEEKS + 1 },
    (_, week) => week,
  )
}

/** Calendar day of week 5 if every day from `startIso` matched today. */
export function completeDayProjectionEndIso(startIso: string): string {
  return format(
    addDays(parseISO(startIso), COMPLETE_DAY_HORIZON_DAYS),
    'yyyy-MM-dd',
  )
}

/** #945/#947 — axis end label is the calendar date only. */
export function completeDayChartEndAxisLabel(formattedDate: string): string {
  return formattedDate
}

export function completeDayWeightGridTicksKg(
  minKg: number,
  maxKg: number,
): number[] {
  const lo = Math.min(minKg, maxKg)
  const hi = Math.max(minKg, maxKg)
  const start = Math.floor(lo / COMPLETE_DAY_GRID_KG) * COMPLETE_DAY_GRID_KG
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
  /** #947 — ISO log date; seeds the synthetic daily oscillation. */
  logDate?: string
}

export interface CompleteDayProjectionPoint {
  week: number
  weightKg: number
}

/** #946/#947 — oscillating daily path + lagged 7-day companion. */
export interface CompleteDayProjectionChartPoint {
  week: number
  weightKg: number
  averageKg: number
}

export interface CompleteDayProjection {
  tdeeKcal: number
  dailyDeficitKcal: number
  /** Starting weight minus week-5 weight. Positive = lower. */
  totalChangeKg: number
  projectedWeightKg: number
  points: CompleteDayProjectionPoint[]
  chartPoints: CompleteDayProjectionChartPoint[]
}

/**
 * #946/#947 — trailing-window companion for the daily series, matching
 * Dashboard `rollingAverage` (partial window at the start, then a full
 * 7-day mean so the dashed line lags the solid path).
 */
export function completeDayProjectionChartPoints(
  dailyKg: number[],
  windowDays: number = COMPLETE_DAY_TREND_WINDOW_DAYS,
): CompleteDayProjectionChartPoint[] {
  let sum = 0
  return dailyKg.map((weightKg, day) => {
    sum += weightKg
    const start = Math.max(0, day - windowDays + 1)
    if (start > 0) {
      sum -= dailyKg[start - 1]!
    }
    return {
      week: day / 7,
      weightKg,
      averageKg: sum / (day - start + 1),
    }
  })
}

function fnv1aSeed(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** #947 — stable seed for the same log day and projection inputs. */
export function completeDayOscillationSeed(
  input: Pick<
    CompleteDayProjectionInput,
    | 'logDate'
    | 'weightKg'
    | 'dailyKcal'
    | 'heightCm'
    | 'age'
    | 'sex'
    | 'activityLevel'
  >,
): number {
  return fnv1aSeed(
    [
      input.logDate ?? '',
      input.weightKg.toFixed(3),
      input.dailyKcal,
      input.heightCm,
      input.age,
      input.sex,
      input.activityLevel,
    ].join('|'),
  )
}

/**
 * #947 — synthetic daily scale readings around `trendKg`. Day 0 and the
 * last day stay on the trend so start/end markers match today and the
 * estimate; interior days wander with a mean-reverting wobble.
 */
export function completeDayOscillatingDailyKg(
  trendKg: number[],
  seed: number,
  amplitudeKg: number = COMPLETE_DAY_OSCILLATION_KG,
): number[] {
  const last = trendKg.length - 1
  if (last <= 0) return [...trendKg]
  const next = mulberry32(seed)
  let residual = 0
  return trendKg.map((trend, day) => {
    residual = residual * 0.55 + (next() * 2 - 1) * amplitudeKg
    const fade = Math.min(day / 2, (last - day) / 2, 1)
    return trend + residual * fade
  })
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
  const dailyTrendKg: number[] = [weightKg]
  for (let day = 1; day <= COMPLETE_DAY_HORIZON_DAYS; day += 1) {
    const bmr = calculateBmr(weightKg, input.heightCm, input.age, input.sex)
    const tdee = calculateTdee(bmr, input.activityLevel)
    weightKg -= (tdee - input.dailyKcal) / KCAL_PER_KG_FAT
    dailyTrendKg.push(weightKg)
    if (day % 7 === 0) {
      points.push({ week: day / 7, weightKg })
    }
  }
  const projectedWeightKg = points[COMPLETE_DAY_HORIZON_WEEKS]!.weightKg
  const dailyKg = completeDayOscillatingDailyKg(
    dailyTrendKg,
    completeDayOscillationSeed(input),
  )
  return {
    tdeeKcal,
    dailyDeficitKcal: tdeeKcal - input.dailyKcal,
    totalChangeKg: input.weightKg - projectedWeightKg,
    projectedWeightKg,
    points,
    chartPoints: completeDayProjectionChartPoints(dailyKg),
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
  const bmr = calculateBmr(args.weightKg, args.heightCm, args.age, args.sex)
  const tdee = calculateTdee(bmr, args.activityLevel)
  if (args.dailyKcal < tdee * COMPLETE_DAY_LOW_INTAKE_TDEE_FRACTION) {
    return 'unusualLow'
  }
  if (args.dailyKcal > tdee * COMPLETE_DAY_HIGH_INTAKE_TDEE_FRACTION) {
    return 'unusualHigh'
  }
  return undefined
}
