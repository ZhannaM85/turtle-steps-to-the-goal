import { endOfISOWeek, format, parseISO, startOfISOWeek } from 'date-fns'
import { totalCalories, type DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'

export interface WeeklySummary {
  weekStart: string // ISO date (Monday)
  weekEnd: string // ISO date (Sunday)
  averageWeightKg: number | null
  averageCalories: number | null
  /** This week's averageWeightKg minus the prior week's, null if either is unavailable. */
  deltaVsPriorWeekKg: number | null
  /** Whether the actual loss (prior week avg - this week avg) met goal.targetWeeklyLossKg. */
  targetMet: boolean | null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const DATE_FORMAT = 'yyyy-MM-dd'

export function weeklySummaries(
  entries: DailyEntry[],
  goal?: Goal,
): WeeklySummary[] {
  const weekGroups = new Map<string, DailyEntry[]>()

  for (const entry of entries) {
    const weekStart = format(startOfISOWeek(parseISO(entry.date)), DATE_FORMAT)
    const group = weekGroups.get(weekStart)
    if (group) {
      group.push(entry)
    } else {
      weekGroups.set(weekStart, [entry])
    }
  }

  const sortedWeekStarts = [...weekGroups.keys()].sort()

  const summaries: WeeklySummary[] = sortedWeekStarts.map((weekStart) => {
    const weekEntries = weekGroups.get(weekStart)!
    const weekEnd = format(endOfISOWeek(parseISO(weekStart)), DATE_FORMAT)
    const weights = weekEntries
      .map((e) => e.weightKg)
      .filter((v): v is number => v !== undefined)
    const calories = weekEntries
      .map((e) => totalCalories(e.calorieEntries))
      .filter((v): v is number => v !== undefined)

    return {
      weekStart,
      weekEnd,
      averageWeightKg: average(weights),
      averageCalories: average(calories),
      deltaVsPriorWeekKg: null,
      targetMet: null,
    }
  })

  for (let i = 1; i < summaries.length; i++) {
    const current = summaries[i]
    const prior = summaries[i - 1]
    if (current.averageWeightKg === null || prior.averageWeightKg === null) {
      continue
    }

    current.deltaVsPriorWeekKg = current.averageWeightKg - prior.averageWeightKg

    if (goal) {
      const actualLossKg = -current.deltaVsPriorWeekKg
      current.targetMet = actualLossKg >= goal.targetWeeklyLossKg
    }
  }

  return summaries
}
