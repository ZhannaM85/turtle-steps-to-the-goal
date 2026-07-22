import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'

export interface FastingWindowCorrelation {
  dayCount: number
  /** Fasting-duration threshold, in hours, splitting the "shorter" and
   * "longer" groups. */
  thresholdHours: number
  shorterGroupAvgDeltaKg: number
  longerGroupAvgDeltaKg: number
  shorterAveragedMoreGain: boolean
  /** #224 — plain-arithmetic strength label, see correlationStrength.ts. */
  strength: CorrelationStrength
}

// Stricter than lateMealCorrelation's own MIN_COMPARABLE_DAYS (8) — a
// fastingWindowPoints pair needs *two* consecutive days to each have a
// logged meal time (the previous day's last meal, the current day's
// first meal), not just one, so noisier/rarer data needs more of it
// before a split is meaningful.
const MIN_COMPARABLE_DAYS = 10

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return hours * 60 + minutes
}

function lastMealTimeMinutes(entry: DailyEntry): number | null {
  const times = (entry.calorieEntries ?? [])
    .map((meal) => meal.timeEaten)
    .filter((time): time is string => time !== undefined)
  return times.length === 0 ? null : Math.max(...times.map(timeToMinutes))
}

/** The earliest `timeEaten` logged across a day's meals, in minutes since
 * midnight — null if the day has no meals with a time recorded. */
function earliestMealTimeMinutes(entry: DailyEntry): number | null {
  const times = (entry.calorieEntries ?? [])
    .map((meal) => meal.timeEaten)
    .filter((time): time is string => time !== undefined)
  return times.length === 0 ? null : Math.min(...times.map(timeToMinutes))
}

export interface FastingWindowPoint {
  /** The day the fasting window *ends* on (the day whose first meal and
   * weight this point is about) — lets `customChartSeries.ts` key a
   * per-day `fastingHours` series off this same computation (#257)
   * without recomputing it. */
  date: string
  fastingHours: number
  deltaKg: number
}

/**
 * Each day pair's *actual elapsed fasting duration* — the previous day's
 * latest meal to the current day's earliest meal, correctly spanning
 * midnight (the earliest meal is always the day after the latest one) —
 * paired with that same day-over-day weight change, the same day-pairing
 * convention `lateMealPoints` already uses (#116). Distinct from
 * `lateMealPoints`, which only looks at a raw clock time (when the last
 * meal was), not the actual gap between meals: two days with the same
 * "last ate at 9pm" could have very different fasting windows depending
 * on when the next meal starts. A day pair only contributes a point if
 * the previous day has a logged weight and at least one meal with a
 * recorded time, and the current day also has a logged weight and at
 * least one meal with a recorded time.
 */
export function fastingWindowPoints(entries: DailyEntry[]): FastingWindowPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: FastingWindowPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    const lastMealMinutes = lastMealTimeMinutes(entry)
    if (lastMealMinutes === null) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    const nextEarliestMinutes = earliestMealTimeMinutes(nextEntry)
    if (nextEarliestMinutes === null) continue

    const fastingMinutes = 24 * 60 - lastMealMinutes + nextEarliestMinutes
    points.push({
      date: nextEntry.date,
      fastingHours: fastingMinutes / 60,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * Plain-arithmetic median-split summary, same shape as `lateMealCorrelation`/
 * `sleepCorrelation`: splits `fastingWindowPoints`' comparable day-pairs into
 * a shorter-fast and longer-fast half by median hours, and reports which
 * half averaged more next-day gain. Requires MIN_COMPARABLE_DAYS pairs.
 * Returns null otherwise. Answers "did my own shorter/longer-than-usual
 * fasts do worse" — relative to this user's own data.
 */
export function fastingWindowCorrelation(
  entries: DailyEntry[],
): FastingWindowCorrelation | null {
  const points = fastingWindowPoints(entries)

  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.fastingHours - b.fastingHours)
  const mid = Math.ceil(sorted.length / 2)
  const shorterGroup = sorted.slice(0, mid)
  const longerGroup = sorted.slice(mid)
  if (longerGroup.length === 0) return null

  const shorterGroupAvgDeltaKg = average(shorterGroup.map((p) => p.deltaKg))
  const longerGroupAvgDeltaKg = average(longerGroup.map((p) => p.deltaKg))
  const rawThresholdHours =
    (shorterGroup[shorterGroup.length - 1].fastingHours +
      longerGroup[0].fastingHours) /
    2

  return {
    dayCount: points.length,
    thresholdHours: Math.round(rawThresholdHours * 2) / 2,
    shorterGroupAvgDeltaKg,
    longerGroupAvgDeltaKg,
    shorterAveragedMoreGain: shorterGroupAvgDeltaKg > longerGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      longerGroupAvgDeltaKg - shorterGroupAvgDeltaKg,
      DAILY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}
