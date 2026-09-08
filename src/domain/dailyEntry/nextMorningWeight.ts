/**
 * #829 — derived “next morning” weigh-in for a calendar day: strictly
 * `date + 1`, never a later logged weight if that next day is empty.
 */
export function nextMorningWeight(
  currentWeightKg: number | undefined,
  nextCalendarDayWeightKg: number | undefined,
): { weightKg: number; changeKg: number | null } | null {
  if (nextCalendarDayWeightKg === undefined) return null
  return {
    weightKg: nextCalendarDayWeightKg,
    changeKg:
      currentWeightKg === undefined
        ? null
        : nextCalendarDayWeightKg - currentWeightKg,
  }
}
