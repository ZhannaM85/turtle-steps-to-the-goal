import { addDays, endOfWeek, format, parseISO, startOfWeek, type Day } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'

/** How many of the app's core loggable signals a day recorded — weight,
 * any meal, sleep (either hours field), steps. A day with a note only, or
 * a period/constipation flag only, still counts as 0 here; those are
 * secondary details, not the habit this view is meant to visualize. */
export const MAX_LOGGING_SIGNALS = 4

export interface LoggingConsistencyDay {
  date: string
  /** 0-MAX_LOGGING_SIGNALS, or `null` for a day outside the entries range
   * (shouldn't normally happen since the range is derived from the data
   * itself, kept only for a well-typed grid cell). */
  intensity: number
}

export interface LoggingConsistencyWeek {
  weekStart: string
  /** Always exactly 7, ordered from `weekStartsOn`. */
  days: LoggingConsistencyDay[]
}

function signalsLogged(entry: DailyEntry | undefined): number {
  if (!entry) return 0
  let count = 0
  if (entry.weightKg !== undefined) count += 1
  if (entry.calorieEntries !== undefined && entry.calorieEntries.length > 0) {
    count += 1
  }
  if (entry.sleepHours !== undefined || entry.deepSleepHours !== undefined) {
    count += 1
  }
  if (entry.steps !== undefined) count += 1
  return count
}

/**
 * One row per calendar week (#223) from the earliest logged entry through
 * today, each holding 7 day-cells with a 0-4 "how much was logged" score —
 * powers a GitHub-contribution-graph-style logging-consistency heatmap.
 * `weekStartsOn` (#85) resolved by the caller via `useWeekStartsOn`, same
 * convention as `weeklySummaries`. Returns `[]` for no entries — nothing to
 * anchor a range to.
 */
export function loggingConsistencyWeeks(
  entries: DailyEntry[],
  weekStartsOn: Day = 1,
): LoggingConsistencyWeek[] {
  if (entries.length === 0) return []

  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const earliestDate = [...byDate.keys()].sort()[0]
  const rangeStart = startOfWeek(parseISO(earliestDate), { weekStartsOn })
  const rangeEnd = endOfWeek(new Date(), { weekStartsOn })

  const weeks: LoggingConsistencyWeek[] = []
  for (let cursor = rangeStart; cursor <= rangeEnd; cursor = addDays(cursor, 7)) {
    const days: LoggingConsistencyDay[] = []
    for (let i = 0; i < 7; i++) {
      const dateStr = format(addDays(cursor, i), 'yyyy-MM-dd')
      days.push({ date: dateStr, intensity: signalsLogged(byDate.get(dateStr)) })
    }
    weeks.push({ weekStart: format(cursor, 'yyyy-MM-dd'), days })
  }
  return weeks
}
