import type { WaterEntry } from './DailyEntry'

/** Sums a day's discrete water entries (#271). Undefined (not 0) when none
 * exist, same "nothing logged" convention as totalCalories. */
export function totalWaterMl(
  entries: WaterEntry[] | undefined,
): number | undefined {
  if (!entries || entries.length === 0) return undefined
  return entries.reduce((sum, entry) => sum + entry.amountMl, 0)
}
