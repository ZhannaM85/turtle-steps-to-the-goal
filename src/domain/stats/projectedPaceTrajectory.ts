import { addWeeks, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'

export interface TrajectoryPoint {
  date: string
  weightKg: number
}

const DATE_FORMAT = 'yyyy-MM-dd'
const PROJECTION_WEEKS = 4

/**
 * A short straight-line projection from the most recently logged weight,
 * forward a few weeks at the goal's current weekly pace. Unlike the old
 * goal-to-target trajectory (removed in #14 along with the long-term
 * target), this always anchors on real data and implies no fixed end date
 * or weight — a near-term "if this pace holds" preview, not a commitment.
 * Returns an empty array when there's no goal or no logged weight yet.
 */
export function projectedPaceTrajectory(
  entries: DailyEntry[],
  goal: Goal | null,
): TrajectoryPoint[] {
  if (!goal) return []

  const latest = [...entries]
    .filter(
      (entry): entry is DailyEntry & { weightKg: number } =>
        entry.weightKg !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)

  if (!latest) return []

  const start: TrajectoryPoint = {
    date: latest.date,
    weightKg: latest.weightKg,
  }
  const projectedWeightKg = Math.max(
    0,
    latest.weightKg - goal.targetWeeklyLossKg * PROJECTION_WEEKS,
  )
  const end: TrajectoryPoint = {
    date: format(
      addWeeks(parseISO(latest.date), PROJECTION_WEEKS),
      DATE_FORMAT,
    ),
    weightKg: projectedWeightKg,
  }

  return [start, end]
}
