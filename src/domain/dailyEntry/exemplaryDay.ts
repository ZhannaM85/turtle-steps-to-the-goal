import { differenceInCalendarDays, parseISO } from 'date-fns'

/** A logged day reduced to what the exemplary-day picker needs. */
export interface ExemplaryDayInput {
  date: string
  weightKg?: number
  calories?: number
  mealCount: number
}

/** One past day the user can open or pin. */
export interface ExemplaryDayCandidate {
  date: string
  calories: number
  /** Later weigh-in minus earlier weigh-in, kg. Negative is a loss. */
  weightChangeKg: number
}

export interface SuggestExemplaryDayOptions {
  /** Current weekly loss target, kg. Positive means loss. */
  targetWeeklyLossKg?: number
  /** User's daily calorie target, when set. */
  dailyCalorieTargetKcal?: number
  dismissedDates?: readonly string[]
}

const MIN_MEALS = 2
const MAX_CANDIDATES = 5
/** Used when the user has no weekly target yet. */
const DEFAULT_WEEKLY_LOSS_KG = 0.5

/**
 * Past days whose surrounding weigh-ins lost weight near the weekly pace,
 * and whose own log is filled in. The biggest drop and a very low-calorie
 * day stay out. The first candidate is the suggestion.
 */
export function suggestExemplaryDays(
  days: readonly ExemplaryDayInput[],
  options: SuggestExemplaryDayOptions = {},
): ExemplaryDayCandidate[] {
  const dismissed = new Set(options.dismissedDates ?? [])
  const referencePace =
    options.targetWeeklyLossKg !== undefined && options.targetWeeklyLossKg > 0
      ? options.targetWeeklyLossKg
      : DEFAULT_WEEKLY_LOSS_KG
  const calorieFloor = calorieFloorFor(days, options.dailyCalorieTargetKcal)
  const calorieReference =
    options.dailyCalorieTargetKcal !== undefined &&
    options.dailyCalorieTargetKcal > 0
      ? options.dailyCalorieTargetKcal
      : median(
          days
            .filter(
              (day) =>
                day.mealCount >= MIN_MEALS && day.calories !== undefined,
            )
            .map((day) => day.calories!),
        )

  const weighIns = days
    .filter(
      (day): day is ExemplaryDayInput & { weightKg: number } =>
        day.weightKg !== undefined && Number.isFinite(day.weightKg),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const ranked: Array<ExemplaryDayCandidate & { paceDistance: number; calorieDistance: number }> =
    []

  for (let index = 0; index < weighIns.length - 1; index += 1) {
    const earlier = weighIns[index]!
    const later = weighIns[index + 1]!
    const spanDays = differenceInCalendarDays(
      parseISO(later.date),
      parseISO(earlier.date),
    )
    if (spanDays <= 0) continue
    const weeklyLoss = ((earlier.weightKg - later.weightKg) / spanDays) * 7
    if (!nearPace(weeklyLoss, referencePace)) continue
    const weightChangeKg = later.weightKg - earlier.weightKg

    for (const day of days) {
      if (day.date < earlier.date || day.date >= later.date) continue
      if (dismissed.has(day.date)) continue
      if (day.mealCount < MIN_MEALS || day.calories === undefined) continue
      if (day.calories < calorieFloor) continue
      ranked.push({
        date: day.date,
        calories: day.calories,
        weightChangeKg,
        paceDistance: Math.abs(weeklyLoss - referencePace),
        calorieDistance:
          calorieReference === undefined
            ? 0
            : Math.abs(day.calories - calorieReference),
      })
    }
  }

  ranked.sort((a, b) => {
    if (a.paceDistance !== b.paceDistance) return a.paceDistance - b.paceDistance
    if (a.calorieDistance !== b.calorieDistance) {
      return a.calorieDistance - b.calorieDistance
    }
    return b.date.localeCompare(a.date)
  })

  const seen = new Set<string>()
  const candidates: ExemplaryDayCandidate[] = []
  for (const candidate of ranked) {
    if (seen.has(candidate.date)) continue
    seen.add(candidate.date)
    candidates.push({
      date: candidate.date,
      calories: candidate.calories,
      weightChangeKg: candidate.weightChangeKg,
    })
    if (candidates.length === MAX_CANDIDATES) break
  }
  return candidates
}

function nearPace(weeklyLossKg: number, referencePaceKg: number): boolean {
  return (
    weeklyLossKg >= referencePaceKg * 0.5 - 1e-6 &&
    weeklyLossKg <= referencePaceKg * 1.5 + 1e-6
  )
}

/** Days far under the calorie target, or in the bottom of this user's
 * own logged days, are not examples. */
function calorieFloorFor(
  days: readonly ExemplaryDayInput[],
  dailyCalorieTargetKcal: number | undefined,
): number {
  if (dailyCalorieTargetKcal !== undefined && dailyCalorieTargetKcal > 0) {
    return dailyCalorieTargetKcal * 0.8
  }
  const logged = days
    .filter((day) => day.mealCount >= MIN_MEALS && day.calories !== undefined)
    .map((day) => day.calories!)
  const middle = median(logged)
  if (middle === undefined) return 0
  return middle * 0.75
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1]! + sorted[mid]!) / 2
}
