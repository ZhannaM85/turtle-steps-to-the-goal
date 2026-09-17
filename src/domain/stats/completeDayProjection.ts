import { addDays, format, parseISO } from 'date-fns'
import { KCAL_PER_KG_FAT } from '@/domain/goal'
import { calculateBmr, type Sex } from './bodyComposition'
import { calculateTdee, type ActivityLevel } from './targetCalculator'

/** #948 — Week / Month / Year tab horizons (exact day lengths). */
export type CompleteDayHorizon = 'week' | 'month' | 'year'
export const COMPLETE_DAY_DEFAULT_HORIZON: CompleteDayHorizon = 'week'
export const COMPLETE_DAY_HORIZON_DAYS = {
  week: 7,
  month: 30,
  year: 365,
} as const
export const COMPLETE_DAY_HORIZONS: CompleteDayHorizon[] = [
  'week',
  'month',
  'year',
]

export function completeDayHorizonDays(
  horizon: CompleteDayHorizon = COMPLETE_DAY_DEFAULT_HORIZON,
): number {
  return COMPLETE_DAY_HORIZON_DAYS[horizon]
}

/** X-axis units stay “weeks” (day / 7) so a 30-day month ends at ~4.29. */
export function completeDayHorizonWeeks(
  horizon: CompleteDayHorizon = COMPLETE_DAY_DEFAULT_HORIZON,
): number {
  return completeDayHorizonDays(horizon) / 7
}

/** Skip the projection when today's intake is below half of estimated TDEE. */
export const COMPLETE_DAY_LOW_INTAKE_TDEE_FRACTION = 0.5
/** Skip the projection when today's intake is above 1.5× estimated TDEE. */
export const COMPLETE_DAY_HIGH_INTAKE_TDEE_FRACTION = 1.5
/** #936 — horizontal dashed mesh every 500 g. */
export const COMPLETE_DAY_GRID_KG = 0.5
/** #946/#947 — same 7-day companion window as the About/Dashboard weight trend. */
export const COMPLETE_DAY_TREND_WINDOW_DAYS = 7
/** #947 — typical morning-scale wobble around the projected trend, in kg. */
export const COMPLETE_DAY_OSCILLATION_KG = 0.4

export function completeDayWeekGridTicks(
  horizon: CompleteDayHorizon = COMPLETE_DAY_DEFAULT_HORIZON,
): number[] {
  const endWeek = completeDayHorizonWeeks(horizon)
  if (endWeek <= 0) return [0]
  const maxTicks = 7
  const step = endWeek <= maxTicks - 1 ? 1 : endWeek / (maxTicks - 1)
  const ticks: number[] = [0]
  if (step === 1) {
    for (let week = 1; week < endWeek; week += 1) {
      ticks.push(week)
    }
  } else {
    for (let i = 1; i < maxTicks - 1; i += 1) {
      const week = step * i
      if (week < endWeek - 1e-9) ticks.push(week)
    }
  }
  ticks.push(endWeek)
  return ticks
}

/** Calendar day at the selected horizon if every day from `startIso` matched today. */
export function completeDayProjectionEndIso(
  startIso: string,
  horizon: CompleteDayHorizon = COMPLETE_DAY_DEFAULT_HORIZON,
): string {
  return format(
    addDays(parseISO(startIso), completeDayHorizonDays(horizon)),
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
  /** #948 — Week / Month / Year horizon; default Week (7 days). */
  horizon?: CompleteDayHorizon
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
  /** Starting weight minus end-of-horizon weight. Positive = lower. */
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
 * #934/#948 — simulation if every day matched today's calories, for the
 * selected horizon (Week=7, Month=30, Year=365). Recalculates
 * Mifflin–St Jeor TDEE as weight moves so the line is not a straight
 * `deficit × days / 7700` ruler. Not medical advice.
 */
export function projectWeightIfEatingLikeToday(
  input: CompleteDayProjectionInput,
): CompleteDayProjection {
  const horizon = input.horizon ?? COMPLETE_DAY_DEFAULT_HORIZON
  const horizonDays = completeDayHorizonDays(horizon)
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
  for (let day = 1; day <= horizonDays; day += 1) {
    const bmr = calculateBmr(weightKg, input.heightCm, input.age, input.sex)
    const tdee = calculateTdee(bmr, input.activityLevel)
    weightKg -= (tdee - input.dailyKcal) / KCAL_PER_KG_FAT
    dailyTrendKg.push(weightKg)
    if (day % 7 === 0 || day === horizonDays) {
      points.push({ week: day / 7, weightKg })
    }
  }
  const projectedWeightKg = dailyTrendKg[horizonDays]!
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
