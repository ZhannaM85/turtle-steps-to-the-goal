import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { recentAverages, type RecentAverages } from '@/domain/stats'
import type { Goal } from './Goal'
import { goalWeekEnd } from './goalWindowProgress'

/**
 * Average kcal/protein across the active goal's own window (#602) — reuses
 * `recentAverages` (no new averaging math) by translating the goal's
 * `[weekStart, weekEnd]` range into the "N days back from a reference
 * date" shape that function already expects. The reference date is
 * `min(today, weekEnd)`, same clamping `goalWindowProgress`'s own
 * `effectiveAsOf`-style reasoning uses elsewhere — a window still in
 * progress averages only its logged-so-far days, not the full 7.
 */
export function goalWindowAverages(
  entries: DailyEntry[],
  goal: Goal,
  today: Date = new Date(),
): RecentAverages {
  if (!goal.weekStart) return { averageCalories: null, averageProteinG: null }
  const weekEnd = goalWeekEnd(goal.weekStart)
  const todayStr = format(today, 'yyyy-MM-dd')
  const referenceDate = todayStr < weekEnd ? today : parseISO(weekEnd)
  const windowDays =
    differenceInCalendarDays(referenceDate, parseISO(goal.weekStart)) + 1
  if (windowDays <= 0) return { averageCalories: null, averageProteinG: null }
  return recentAverages(entries, windowDays, referenceDate)
}
