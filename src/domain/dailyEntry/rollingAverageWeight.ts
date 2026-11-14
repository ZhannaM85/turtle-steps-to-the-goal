import { addDays, format, parseISO } from 'date-fns'

/**
 * Average of weigh-ins in the window ending on `endDate`, inclusive.
 * Days without a weight are skipped. Fewer than two weigh-ins has no average.
 */
export function rollingAverageWeightKg(
  entries: readonly { date: string; weightKg?: number }[],
  endDate: string,
  windowDays: number,
): number | null {
  const start = format(
    addDays(parseISO(endDate), -(windowDays - 1)),
    'yyyy-MM-dd',
  )
  const weights = entries
    .filter(
      (entry) =>
        entry.weightKg !== undefined &&
        Number.isFinite(entry.weightKg) &&
        entry.date >= start &&
        entry.date <= endDate,
    )
    .map((entry) => entry.weightKg!)
  if (weights.length < 2) return null
  return weights.reduce((sum, weight) => sum + weight, 0) / weights.length
}
