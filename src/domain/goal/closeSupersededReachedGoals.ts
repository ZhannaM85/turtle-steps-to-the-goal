import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalWeekEnd, goalWindowProgress } from './goalWindowProgress'

/**
 * #1090 — recover a missed early-close handoff (including backups that
 * lost weekEnd). Only the immediate successor starting on the first
 * qualifying weigh-in establishes that this goal was concluded early.
 * A crossing without that successor keeps the ordinary final-weight rule.
 * Returns only changed records; baseline snapshots and active goals stay put.
 */
export function closeSupersededReachedGoals(
  goals: Goal[],
  entries: DailyEntry[],
): Goal[] {
  const ordered = [...goals].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const closed: Goal[] = []
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const goal = ordered[i]
    const next = ordered[i + 1]
    const boundary = next.weekStart
    if (!goal.weekStart || !boundary || next.createdAt <= goal.createdAt) continue
    const plannedEnd = goal.weekEnd ?? goalWeekEnd(goal.weekStart)
    if (boundary < goal.weekStart || boundary >= plannedEnd) continue
    const progress = goalWindowProgress(entries, { ...goal, weekEnd: boundary })
    if (progress?.metOnDate !== boundary || progress.finalTargetMet !== true) continue
    closed.push({ ...goal, weekEnd: boundary, updatedAt: new Date().toISOString() })
  }
  return closed
}
