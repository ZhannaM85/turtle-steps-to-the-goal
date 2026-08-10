import type { Goal } from './Goal'
import { goalWeekEnd } from './goalWindowProgress'

/**
 * Inclusive ISO-date (`yyyy-MM-dd`) range overlap (#683). String compare is
 * valid for this format.
 */
export function inclusiveDateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/** Resolved inclusive window for a goal, or null when it has no weekStart. */
export function goalWindowRange(
  goal: Pick<Goal, 'weekStart' | 'weekEnd'>,
): { start: string; end: string } | null {
  if (!goal.weekStart) return null
  return {
    start: goal.weekStart,
    end: goal.weekEnd ?? goalWeekEnd(goal.weekStart),
  }
}

/** True when both goals have windows and those windows share any day (#683). */
export function goalWindowsOverlap(
  a: Pick<Goal, 'weekStart' | 'weekEnd'>,
  b: Pick<Goal, 'weekStart' | 'weekEnd'>,
): boolean {
  const ar = goalWindowRange(a)
  const br = goalWindowRange(b)
  if (!ar || !br) return false
  return inclusiveDateRangesOverlap(ar.start, ar.end, br.start, br.end)
}

/**
 * Soft overlap check for GoalForm (#683/#685) — true when `draft` shares any
 * day with another goal's window. `excludeId` skips the goal being edited
 * in place so a form never warns against itself.
 */
export function draftWindowOverlapsOthers(
  draft: Pick<Goal, 'weekStart' | 'weekEnd'>,
  others: Array<Pick<Goal, 'id' | 'weekStart' | 'weekEnd'>>,
  excludeId?: string,
): boolean {
  return others.some(
    (goal) =>
      (excludeId === undefined || goal.id !== excludeId) &&
      goalWindowsOverlap(draft, goal),
  )
}
