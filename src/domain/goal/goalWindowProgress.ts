import { addDays, format, parseISO, subDays } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'

const DATE_FORMAT = 'yyyy-MM-dd'

/** The last day of the 7-day window `weekStart` anchors (#135) — a fixed
 * 7-day span from whenever the target was last saved, not a calendar
 * grid. */
export function goalWeekEnd(weekStart: string): string {
  return format(addDays(parseISO(weekStart), 6), DATE_FORMAT)
}

export interface GoalWindowProgress {
  weekStart: string
  weekEnd: string
  /** Average logged weight within [weekStart, weekEnd] — null if nothing's
   * been logged yet this window. */
  averageWeightKg: number | null
  /** Average logged weight over the 7 days immediately before weekStart —
   * the baseline this window's progress is measured against. Null if
   * there's no data back that far (e.g. a goal set shortly after the user
   * started logging). */
  priorAverageWeightKg: number | null
  /** averageWeightKg - priorAverageWeightKg, null unless both exist. */
  deltaKg: number | null
  /** Whether the actual loss (-deltaKg) met goal.targetWeeklyLossKg — null
   * without enough data to compute deltaKg. */
  targetMet: boolean | null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Progress within a goal's own anchored window (#135), the direct
 * replacement for reading `weeklySummaries()`'s last calendar-week entry —
 * that function stays calendar-grid-based for Dashboard/History's
 * retrospective week-by-week views, a separate concern from "is the
 * currently active target being met." Returns null when the goal has no
 * `weekStart` yet (an old goal never re-saved since #135).
 */
export function goalWindowProgress(
  entries: DailyEntry[],
  goal: Goal,
): GoalWindowProgress | null {
  const weekStart = goal.weekStart
  if (!weekStart) return null

  const weekEnd = goalWeekEnd(weekStart)
  const priorStart = format(subDays(parseISO(weekStart), 7), DATE_FORMAT)
  const priorEnd = format(subDays(parseISO(weekStart), 1), DATE_FORMAT)

  const currentWeights = entries
    .filter((entry) => entry.date >= weekStart && entry.date <= weekEnd)
    .map((entry) => entry.weightKg)
    .filter((value): value is number => value !== undefined)
  const priorWeights = entries
    .filter((entry) => entry.date >= priorStart && entry.date <= priorEnd)
    .map((entry) => entry.weightKg)
    .filter((value): value is number => value !== undefined)

  const averageWeightKg = average(currentWeights)
  const priorAverageWeightKg = average(priorWeights)
  const deltaKg =
    averageWeightKg !== null && priorAverageWeightKg !== null
      ? averageWeightKg - priorAverageWeightKg
      : null
  const targetMet =
    deltaKg !== null ? -deltaKg >= goal.targetWeeklyLossKg : null

  return {
    weekStart,
    weekEnd,
    averageWeightKg,
    priorAverageWeightKg,
    deltaKg,
    targetMet,
  }
}
