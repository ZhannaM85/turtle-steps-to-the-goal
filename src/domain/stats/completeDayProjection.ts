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
/** #949 — cap labeled Y ticks so Year does not list every 500 g. */
export const COMPLETE_DAY_AXIS_MAX_TICKS = 7
const COMPLETE_DAY_WEIGHT_AXIS_STEPS = [0.5, 1, 2, 5, 10] as const

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

export function completeDayAxisDayNumber(week: number): number {
  return Math.round(week * 7)
}

/** #953 — calendar ISO at a week offset from the log day. */
export function completeDayAxisTickIso(startIso: string, week: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso)) return ''
  const parsed = parseISO(startIso)
  if (Number.isNaN(parsed.getTime())) return ''
  return format(addDays(parsed, completeDayAxisDayNumber(week)), 'yyyy-MM-dd')
}

/** #953 — date-only X label at a grid-aligned tick; never a day count. */
export function completeDayAxisTickLabel(
  week: number,
  startIso: string,
  formatDate: (iso: string) => string,
): string {
  const iso = completeDayAxisTickIso(startIso, week)
  return iso ? formatDate(iso) : ''
}

/**
 * #949/#954 — labeled Y-axis weights and the matching full-width
 * horizontal dashed grid. Same 500 g mesh when the range is small;
 * larger nice steps when a Year-scale span would crowd the plot.
 */
export function completeDayWeightAxisTicks(
  min: number,
  max: number,
  maxTicks: number = COMPLETE_DAY_AXIS_MAX_TICKS,
): number[] {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const span = Math.max(hi - lo, COMPLETE_DAY_GRID_KG)
  const step =
    COMPLETE_DAY_WEIGHT_AXIS_STEPS.find(
      (candidate) => Math.floor(span / candidate) + 1 <= maxTicks,
    ) ??
    COMPLETE_DAY_WEIGHT_AXIS_STEPS[COMPLETE_DAY_WEIGHT_AXIS_STEPS.length - 1]!
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + 1e-9; value += step) {
    ticks.push(Math.round(value * 10) / 10)
  }
  if (ticks.length < 2) {
    ticks.push(Math.round((start + step) * 10) / 10)
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
 * #950 — centered window so the 7-day average cuts through the series
 * instead of riding above a declining path (trailing lag). Edges shrink
 * to the available days rather than looking only backward.
 */
function completeDayCenteredWindowMean(
  values: number[],
  windowDays: number = COMPLETE_DAY_TREND_WINDOW_DAYS,
): number[] {
  const radius = Math.floor(windowDays / 2)
  return values.map((_, day) => {
    const start = Math.max(0, day - radius)
    const end = Math.min(values.length - 1, day + radius)
    let sum = 0
    for (let i = start; i <= end; i += 1) {
      sum += values[i]!
    }
    return sum / (end - start + 1)
  })
}

/**
 * #946/#947/#950 — 7-day companion for the daily series. Centered so the
 * dashed average runs through the middle of the oscillating вес path.
 */
export function completeDayProjectionChartPoints(
  dailyKg: number[],
  windowDays: number = COMPLETE_DAY_TREND_WINDOW_DAYS,
): CompleteDayProjectionChartPoint[] {
  const averages = completeDayCenteredWindowMean(dailyKg, windowDays)
  return dailyKg.map((weightKg, day) => ({
    week: day / 7,
    weightKg,
    averageKg: averages[day]!,
  }))
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
 * #947/#950 — synthetic daily scale readings around `trendKg`. Day 0 and
 * the last day stay on the trend so start/end markers match today and the
 * estimate. Interior noise is high-pass / mean-centered so the walk is
 * zero-mean around the projected path (equally above and below).
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
  const raw: number[] = []
  for (let day = 0; day <= last; day += 1) {
    residual = residual * 0.55 + (next() * 2 - 1) * amplitudeKg
    raw.push(residual)
  }
  const localMean = completeDayCenteredWindowMean(raw)
  const faded = raw.map((value, day) => {
    const fade = Math.min(day / 2, (last - day) / 2, 1)
    return (value - localMean[day]!) * fade
  })
  let interiorSum = 0
  let interiorCount = 0
  for (let day = 1; day < last; day += 1) {
    interiorSum += faded[day]!
    interiorCount += 1
  }
  const interiorMean = interiorCount > 0 ? interiorSum / interiorCount : 0
  return trendKg.map((trend, day) => {
    if (day === 0 || day === last) return trend
    return trend + faded[day]! - interiorMean
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
