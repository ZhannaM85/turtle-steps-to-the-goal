import type { CalorieEntry } from './DailyEntry'

type MacroField = 'proteinG' | 'fatG' | 'carbsG'

/** Sums a day's logged macro grams for one field. Undefined (not 0) when no
 * meal logged that macro — distinct from "logged zero", same convention as
 * totalCalories(). Meals that didn't log this particular macro are simply
 * skipped, not treated as zero. */
function totalMacro(
  entries: CalorieEntry[] | undefined,
  field: MacroField,
): number | undefined {
  const values = (entries ?? [])
    .map((entry) => entry[field])
    .filter((value): value is number => value !== undefined)
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0)
}

export function totalProtein(
  entries: CalorieEntry[] | undefined,
): number | undefined {
  return totalMacro(entries, 'proteinG')
}

export function totalFat(
  entries: CalorieEntry[] | undefined,
): number | undefined {
  return totalMacro(entries, 'fatG')
}

export function totalCarbs(
  entries: CalorieEntry[] | undefined,
): number | undefined {
  return totalMacro(entries, 'carbsG')
}
