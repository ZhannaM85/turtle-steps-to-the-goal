import { endOfWeek, format, parseISO, startOfWeek, type Day } from 'date-fns'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  type DailyEntry,
} from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'

export interface WeeklySummary {
  weekStart: string // ISO date (Monday)
  weekEnd: string // ISO date (Sunday)
  averageWeightKg: number | null
  averageCalories: number | null
  /** Averaged only over days that logged that particular macro (#53) — a
   * day with kcal but no protein logged doesn't pull the average toward 0. */
  averageProteinG: number | null
  averageFatG: number | null
  averageCarbsG: number | null
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

/**
 * `weekStartsOn` (#85) defaults to Monday (`1`, the original ISO-week
 * behavior) — callers resolve the user's week-start preference via
 * `useWeekStartsOn`/`resolveWeekStartsOn` and pass the result in, this
 * function itself has no knowledge of that preference.
 *
 * `goalTrackingStartDate` (#426) is deliberately a separate parameter from
 * `goal` itself — `goal` is whichever goal is currently *active* (used for
 * its `targetWeeklyLossKg`), but this app creates a fresh `Goal` record
 * roughly every week (`saveGoal`, #147/#181), so the active goal's own
 * `createdAt` is almost always very recent. Gating on it directly would
 * wipe out every earlier week's status the moment a new weekly goal starts
 * (confirmed live: the whole "weeks target met" list going empty even
 * though real met weeks existed). Callers should pass
 * `earliestGoalCreatedAt(allGoals)` here instead — the one-time moment
 * goal-tracking itself began — not the active goal's own `createdAt`.
 */
export function weeklySummaries(
  entries: DailyEntry[],
  goal?: Goal,
  weekStartsOn: Day = 1,
  goalTrackingStartDate?: string,
): WeeklySummary[] {
  const weekGroups = new Map<string, DailyEntry[]>()

  for (const entry of entries) {
    const weekStart = format(
      startOfWeek(parseISO(entry.date), { weekStartsOn }),
      DATE_FORMAT,
    )
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
    const weekEnd = format(
      endOfWeek(parseISO(weekStart), { weekStartsOn }),
      DATE_FORMAT,
    )
    const weights = weekEntries
      .map((e) => e.weightKg)
      .filter((v): v is number => v !== undefined)
    const calories = weekEntries
      .map((e) => totalCalories(e.calorieEntries))
      .filter((v): v is number => v !== undefined)
    const protein = weekEntries
      .map((e) => totalProtein(e.calorieEntries))
      .filter((v): v is number => v !== undefined)
    const fat = weekEntries
      .map((e) => totalFat(e.calorieEntries))
      .filter((v): v is number => v !== undefined)
    const carbs = weekEntries
      .map((e) => totalCarbs(e.calorieEntries))
      .filter((v): v is number => v !== undefined)

    return {
      weekStart,
      weekEnd,
      averageWeightKg: average(weights),
      averageCalories: average(calories),
      averageProteinG: average(protein),
      averageFatG: average(fat),
      averageCarbsG: average(carbs),
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

    // #426 — only evaluate weeks that actually fall within goal-tracking's
    // real active window; a week entirely before *any* goal was ever
    // created (e.g. backfilled import history, or the app's own pre-goal
    // history) has nothing to have been "met" against, so it should show no
    // status at all rather than a retroactive comparison. Gated on
    // `goalTrackingStartDate` (the earliest goal ever created), not
    // `goal.createdAt` (the active one) — see this function's own doc
    // comment above. No gating at all when the caller doesn't pass one
    // (existing callers/tests that only pass `goal`), date-only granularity
    // when it is passed, matching this codebase's existing goal-window
    // comparisons (`isDateWithinReachedWindow` etc.), so a week starting the
    // same calendar day goal-tracking began still counts.
    if (
      goal &&
      (goalTrackingStartDate === undefined ||
        current.weekStart >= goalTrackingStartDate.slice(0, 10))
    ) {
      const actualLossKg = -current.deltaVsPriorWeekKg
      current.targetMet = actualLossKg >= goal.targetWeeklyLossKg
    }
  }

  return summaries
}
