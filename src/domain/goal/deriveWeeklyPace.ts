import { differenceInCalendarDays, parseISO } from 'date-fns'

/**
 * Derives the weekly kg pace implied by wanting to go from startWeightKg to
 * targetWeightKg between startDate and targetDate. Returns 0 if targetDate
 * isn't strictly after startDate (no valid pace can be derived).
 */
export function deriveWeeklyPaceKg(
  startDate: string,
  targetDate: string,
  startWeightKg: number,
  targetWeightKg: number,
): number {
  const days = differenceInCalendarDays(
    parseISO(targetDate),
    parseISO(startDate),
  )
  if (days <= 0) return 0

  const weeks = days / 7
  return (startWeightKg - targetWeightKg) / weeks
}
