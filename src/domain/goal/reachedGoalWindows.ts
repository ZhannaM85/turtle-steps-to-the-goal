import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalWindowProgress } from './goalWindowProgress'

const DATE_FORMAT = 'yyyy-MM-dd'

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
 * [start, metOnDate] span. Kept for callers that still need raw window
 * membership; History tinting uses `isHeadingTowardGoalOnDate` (#479). */
export function isDateWithinReachedWindow(
  date: string,
  windows: ReachedGoalWindow[],
): boolean {
  return windows.some((window) => date >= window.start && date <= window.metOnDate)
}

/** Whether `date` is the exact day some goal's target was first met — the
 * reach-day itself, marked distinctly from heading-toward days (#479). */
export function isGoalMetOnDate(
  date: string,
  windows: ReachedGoalWindow[],
): boolean {
  return windows.some((window) => window.metOnDate === date)
}

/**
 * #479 — light tint for a day on the path *before* a reached target:
 * strictly before `metOnDate`, at/after `weekStart`, with a logged weight
 * that dropped day-over-day vs the previous calendar day. Skips days with
 * no weigh-in, no previous-day weigh-in, or a gain/flat (not "heading
 * toward"). Not whole-week membership — only improving pre-met days.
 */
export function isHeadingTowardGoalOnDate(
  date: string,
  windows: ReachedGoalWindow[],
  entries: DailyEntry[],
): boolean {
  if (isGoalMetOnDate(date, windows)) return false
  const inPreMetSpan = windows.some(
    (window) => date >= window.start && date < window.metOnDate,
  )
  if (!inPreMetSpan) return false

  const todayWeight = entries.find((entry) => entry.date === date)?.weightKg
  if (todayWeight === undefined) return false

  const previousDate = format(addDays(parseISO(date), -1), DATE_FORMAT)
  const previousWeight = entries.find(
    (entry) => entry.date === previousDate,
  )?.weightKg
  if (previousWeight === undefined) return false

  // Goals are weekly loss (#203) — a drop is progress.
  return todayWeight < previousWeight
}
