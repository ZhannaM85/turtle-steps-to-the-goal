import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  type DailyEntry,
} from '@/domain/dailyEntry'

export interface MonthlySummary {
  monthStart: string // ISO date, first of the calendar month
  monthEnd: string // ISO date, last of the calendar month
  averageWeightKg: number | null
  averageCalories: number | null
  /** Averaged only over days that logged that particular macro (#53's same
   * reasoning as weeklySummaries.ts) — a day with kcal but no protein
   * logged doesn't pull the average toward 0. */
  averageProteinG: number | null
  averageFatG: number | null
  averageCarbsG: number | null
  /** This month's averageWeightKg minus the prior month's, null if either
   * is unavailable. */
  deltaVsPriorMonthKg: number | null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * Calendar-month grouping (#226) — deliberately simpler than
 * `weeklySummaries.ts`: no `targetMet`/goal comparison, since a goal in
 * this app is always a *weekly* target (`Goal.targetWeeklyLossKg`), and
 * summing several weeks' worth of targets into one rough monthly figure
 * would be inventing a comparison the app doesn't actually make anywhere
 * else, rather than reusing an existing one. Always calendar months (no
 * `weekStartsOn`-style preference the way weeks have) — a month has one
 * unambiguous boundary, unlike a week.
 */
export function monthlySummaries(entries: DailyEntry[]): MonthlySummary[] {
  const monthGroups = new Map<string, DailyEntry[]>()

  for (const entry of entries) {
    const monthStart = format(startOfMonth(parseISO(entry.date)), DATE_FORMAT)
    const group = monthGroups.get(monthStart)
    if (group) {
      group.push(entry)
    } else {
      monthGroups.set(monthStart, [entry])
    }
  }

  const sortedMonthStarts = [...monthGroups.keys()].sort()

  const summaries: MonthlySummary[] = sortedMonthStarts.map((monthStart) => {
    const monthEntries = monthGroups.get(monthStart)!
    const monthEnd = format(endOfMonth(parseISO(monthStart)), DATE_FORMAT)
    const weights = monthEntries
      .map((e) => e.weightKg)
      .filter((v): v is number => v !== undefined)
    const calories = monthEntries
      .map((e) => totalCalories(e.calorieEntries))
      .filter((v): v is number => v !== undefined)
    const protein = monthEntries
      .map((e) => totalProtein(e.calorieEntries))
      .filter((v): v is number => v !== undefined)
    const fat = monthEntries
      .map((e) => totalFat(e.calorieEntries))
      .filter((v): v is number => v !== undefined)
    const carbs = monthEntries
      .map((e) => totalCarbs(e.calorieEntries))
      .filter((v): v is number => v !== undefined)

    return {
      monthStart,
      monthEnd,
      averageWeightKg: average(weights),
      averageCalories: average(calories),
      averageProteinG: average(protein),
      averageFatG: average(fat),
      averageCarbsG: average(carbs),
      deltaVsPriorMonthKg: null,
    }
  })

  for (let i = 1; i < summaries.length; i++) {
    const current = summaries[i]
    const prior = summaries[i - 1]
    if (current.averageWeightKg === null || prior.averageWeightKg === null) {
      continue
    }
    current.deltaVsPriorMonthKg = current.averageWeightKg - prior.averageWeightKg
  }

  return summaries
}
