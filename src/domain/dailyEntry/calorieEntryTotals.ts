import type { CalorieEntry } from './DailyEntry'

type MacroField = 'proteinG' | 'fatG' | 'carbsG'

/** Sums one meal group's items (#81) — always a real number, never
 * undefined, since a group always has at least one item. */
export function calorieEntryKcal(entry: CalorieEntry): number {
  return entry.items.reduce((sum, item) => sum + item.amountKcal, 0)
}

function calorieEntryMacro(
  entry: CalorieEntry,
  field: MacroField,
): number | undefined {
  const values = entry.items
    .map((item) => item[field])
    .filter((value): value is number => value !== undefined)
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0)
}

/** Undefined (not 0) when none of this group's items logged that macro —
 * same convention as the day-level totals in totalMacros.ts. */
export function calorieEntryProtein(entry: CalorieEntry): number | undefined {
  return calorieEntryMacro(entry, 'proteinG')
}

export function calorieEntryFat(entry: CalorieEntry): number | undefined {
  return calorieEntryMacro(entry, 'fatG')
}

export function calorieEntryCarbs(entry: CalorieEntry): number | undefined {
  return calorieEntryMacro(entry, 'carbsG')
}
