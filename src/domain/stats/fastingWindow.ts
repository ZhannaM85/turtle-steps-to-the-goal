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

/**
 * #387 — reported live: a meal logged before the configured day-start
 * time (#298) gets filed under the *previous* calendar day's own
 * `DailyEntry` (`effectiveDateFor`), so a real past-midnight meal (e.g.
 * "01:22") can end up sitting alongside that day's own evening meals
 * (e.g. "19:41"). Left as raw clock minutes, `Math.max`/`Math.min` would
 * treat "01:22" as the *earliest* event of that day instead of what it
 * actually was — the latest, genuinely past real midnight. Shifting any
 * time before the cutoff forward by 24h restores its true chronological
 * position relative to that day's other meals, regardless of which
 * calendar day's bucket it happens to be stored under (a meal manually
 * backdated to an early time via History, not just one filed there live,
 * gets the same treatment — the day-start-time concept is about when a
 * *logical* day ends, not which record happens to hold the meal).
 */
function adjustForDayStart(minutes: number, dayStartMinutes: number): number {
  return minutes < dayStartMinutes ? minutes + 24 * 60 : minutes
}

/** Only `calorieEntries` is ever read here — callers that don't have a
 * full `DailyEntry` (e.g. #287's toast, working from a not-yet-saved
 * `CalorieEntry[]` for "today") can pass a bare `{ calorieEntries }`
 * instead of constructing one. */
type EntryWithMeals = Pick<DailyEntry, 'calorieEntries'>

// #387 — defaults to midnight (today's existing behavior everywhere a
// caller doesn't pass a real value) so this stays a purely additive
// change; only #287's toast (the one actually reported) passes the
// user's real day-start-time setting so far. `fastingWindowCorrelation`/
// `customChartSeries.ts`'s own `fastingHours` series still assume midnight
// — the same "correlation day-pairing... unaffected for now" scope #298
// itself already called out, not newly introduced here.
function lastMealTimeMinutes(
  entry: EntryWithMeals,
  dayStartTime: string,
): number | null {
  const dayStartMinutes = timeToMinutes(dayStartTime)
  const times = (entry.calorieEntries ?? [])
    .map((meal) => meal.timeEaten)
    .filter((time): time is string => time !== undefined)
    .map((time) => adjustForDayStart(timeToMinutes(time), dayStartMinutes))
  return times.length === 0 ? null : Math.max(...times)
}

/** The earliest `timeEaten` logged across a day's meals, in minutes since
 * midnight (day-start-adjusted, see `adjustForDayStart`) — null if the day
 * has no meals with a time recorded. */
function earliestMealTimeMinutes(
  entry: EntryWithMeals,
  dayStartTime: string,
): number | null {
  const dayStartMinutes = timeToMinutes(dayStartTime)
  const times = (entry.calorieEntries ?? [])
    .map((meal) => meal.timeEaten)
    .filter((time): time is string => time !== undefined)
    .map((time) => adjustForDayStart(timeToMinutes(time), dayStartMinutes))
  return times.length === 0 ? null : Math.min(...times)
}

/**
 * The actual elapsed fasting duration between the previous day's latest
 * meal and the current day's earliest meal, correctly spanning midnight —
 * null if either day has no meal with a recorded time. No weight
 * requirement (unlike `fastingWindowPoints` below, which additionally
 * pairs this with a weight delta for correlation purposes) — used
 * directly by #287's "your fasting window was X hours" toast, which has
 * no reason to care whether weight was logged that day at all.
 */
export function fastingHoursBetween(
  previousDayEntry: EntryWithMeals,
  currentDayEntry: EntryWithMeals,
  dayStartTime = '00:00',
): number | null {
  const lastMealMinutes = lastMealTimeMinutes(previousDayEntry, dayStartTime)
  if (lastMealMinutes === null) return null
  const earliestMinutes = earliestMealTimeMinutes(currentDayEntry, dayStartTime)
  if (earliestMinutes === null) return null
  return (24 * 60 - lastMealMinutes + earliestMinutes) / 60
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
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    const fastingHours = fastingHoursBetween(entry, nextEntry)
    if (fastingHours === null) continue

    points.push({
      date: nextEntry.date,
      fastingHours,
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
export function fastingWindowCorrelationFromPoints(
  points: FastingWindowPoint[],
): FastingWindowCorrelation | null {
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

export function fastingWindowCorrelation(
  entries: DailyEntry[],
): FastingWindowCorrelation | null {
  return fastingWindowCorrelationFromPoints(fastingWindowPoints(entries))
}
