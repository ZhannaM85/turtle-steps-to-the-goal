import { addDays, format, parseISO } from 'date-fns'
import type { Goal } from '@/domain/goal'

export interface TrajectoryPoint {
  date: string
  weightKg: number
}

const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * The straight-line path from the goal's start weight/date to its target
 * weight/date, as two endpoints for a chart overlay. If `targetDate` isn't
 * set, it's derived from the weekly pace (targetWeeklyLossKg). When the pace
 * can't produce a valid target date (e.g. zero/negative pace with a
 * non-zero amount left to lose), only the start point is returned.
 */
export function projectedTrajectory(goal: Goal): TrajectoryPoint[] {
  const start: TrajectoryPoint = {
    date: goal.startDate,
    weightKg: goal.startWeightKg,
  }

  const targetDate = goal.targetDate ?? deriveTargetDate(goal)
  if (targetDate === null) return [start]

  return [start, { date: targetDate, weightKg: goal.targetWeightKg }]
}

function deriveTargetDate(goal: Goal): string | null {
  const totalChangeKg = goal.startWeightKg - goal.targetWeightKg

  if (totalChangeKg === 0) return goal.startDate
  if (goal.targetWeeklyLossKg <= 0) return null

  const weeksNeeded = totalChangeKg / goal.targetWeeklyLossKg
  const daysNeeded = Math.round(weeksNeeded * 7)
  return format(addDays(parseISO(goal.startDate), daysNeeded), DATE_FORMAT)
}
