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
  /** Day the user is viewing — used to prefer nearby candidates. */
  referenceDate: string
  /** User's daily calorie target, when set. */
  dailyCalorieTargetKcal?: number
  dismissedDates?: readonly string[]
}

const MIN_MEALS = 2
const MAX_CANDIDATES = 5
/** Overnight / next-weigh-in loss that counts as a real drop (#1125). */
const MIN_LOSS_KG = 0.2

/**
 * Past days with calories in a healthy band (not a crash day, not over the
 * daily target when one is set) whose next weigh-in dropped at least 200 g.
 * The candidate nearest to `referenceDate` is first.
 */
export function suggestExemplaryDays(
  days: readonly ExemplaryDayInput[],
  options: SuggestExemplaryDayOptions,
): ExemplaryDayCandidate[] {
  const dismissed = new Set(options.dismissedDates ?? [])
  const { floor, ceiling } = calorieBandFor(
    days,
    options.dailyCalorieTargetKcal,
  )

  const weighIns = days
    .filter(
      (day): day is ExemplaryDayInput & { weightKg: number } =>
        day.weightKg !== undefined && Number.isFinite(day.weightKg),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const ranked: ExemplaryDayCandidate[] = []

  for (const day of days) {
    if (dismissed.has(day.date)) continue
    if (day.mealCount < MIN_MEALS || day.calories === undefined) continue
    if (day.calories < floor || day.calories > ceiling) continue

    const baseline = lastWeighInOnOrBefore(weighIns, day.date)
    const next = firstWeighInAfter(weighIns, day.date)
    if (!baseline || !next) continue

    const lossKg = baseline.weightKg - next.weightKg
    if (lossKg < MIN_LOSS_KG - 1e-6) continue

    ranked.push({
      date: day.date,
      calories: day.calories,
      weightChangeKg: next.weightKg - baseline.weightKg,
    })
  }

  ranked.sort((a, b) => {
    const distanceA = Math.abs(
      differenceInCalendarDays(
        parseISO(a.date),
        parseISO(options.referenceDate),
      ),
    )
    const distanceB = Math.abs(
      differenceInCalendarDays(
        parseISO(b.date),
        parseISO(options.referenceDate),
      ),
    )
    if (distanceA !== distanceB) return distanceA - distanceB
    return b.date.localeCompare(a.date)
  })

  return ranked.slice(0, MAX_CANDIDATES)
}

function lastWeighInOnOrBefore(
  weighIns: readonly (ExemplaryDayInput & { weightKg: number })[],
  date: string,
): (ExemplaryDayInput & { weightKg: number }) | undefined {
  let match: (ExemplaryDayInput & { weightKg: number }) | undefined
  for (const weighIn of weighIns) {
    if (weighIn.date > date) break
    match = weighIn
  }
  return match
}

function firstWeighInAfter(
  weighIns: readonly (ExemplaryDayInput & { weightKg: number })[],
  date: string,
): (ExemplaryDayInput & { weightKg: number }) | undefined {
  return weighIns.find((weighIn) => weighIn.date > date)
}

/** At/under the daily target (or the user's typical day), and not a crash. */
function calorieBandFor(
  days: readonly ExemplaryDayInput[],
  dailyCalorieTargetKcal: number | undefined,
): { floor: number; ceiling: number } {
  if (dailyCalorieTargetKcal !== undefined && dailyCalorieTargetKcal > 0) {
    return {
      floor: dailyCalorieTargetKcal * 0.8,
      ceiling: dailyCalorieTargetKcal,
    }
  }
  const logged = days
    .filter((day) => day.mealCount >= MIN_MEALS && day.calories !== undefined)
    .map((day) => day.calories!)
  const middle = median(logged)
  if (middle === undefined) return { floor: 0, ceiling: Number.POSITIVE_INFINITY }
  return { floor: middle * 0.75, ceiling: middle }
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1]! + sorted[mid]!) / 2
}
