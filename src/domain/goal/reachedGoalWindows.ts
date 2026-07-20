import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalWindowProgress } from './goalWindowProgress'

export interface ReachedGoalWindow {
  /** goal.weekStart — first day of the window that was reached. */
  start: string
  /** goalWindowProgress().metOnDate — the day the target was first
   * crossed, and (#155) the window's own effective end: only
   * [start, metOnDate] counts as "successful," not the full 7 days. */
  metOnDate: string
}

/**
 * Every window — past or currently active — that actually reached its
 * target, as a [start, metOnDate] span (#155). Reused by History to
 * highlight which days were part of a successful goal without re-deriving
 * goalWindowProgress() itself for every row/cell. A window that hasn't
 * been reached, or has no weekStart at all (a pre-#135 record), contributes
 * nothing.
 */
export function reachedGoalWindows(
  goals: Goal[],
  entries: DailyEntry[],
): ReachedGoalWindow[] {
  return goals.flatMap((goal) => {
    const progress = goalWindowProgress(entries, goal)
    if (!progress?.metOnDate) return []
    return [{ start: progress.weekStart, metOnDate: progress.metOnDate }]
  })
}

/** Whether `date` (YYYY-MM-DD) falls within any reached window's
 * [start, metOnDate] span. */
export function isDateWithinReachedWindow(
  date: string,
  windows: ReachedGoalWindow[],
): boolean {
  return windows.some((window) => date >= window.start && date <= window.metOnDate)
}

/** Whether `date` is the exact day some goal's target was first met — the
 * reach-day itself, marked distinctly from the rest of its window. */
export function isGoalMetOnDate(
  date: string,
  windows: ReachedGoalWindow[],
): boolean {
  return windows.some((window) => window.metOnDate === date)
}
