import type { CalorieEntry, DayTotals } from './DailyEntry'

type MealMacroField = 'proteinG' | 'fatG' | 'carbsG'

type MacroField =
  | MealMacroField
  | 'fiberG'
  | 'sodiumMg'
  | 'potassiumMg'
  | 'magnesiumMg'

/** Sums a day's logged macro grams for one field, across every item of
 * every meal (#81 — flattened, not per-meal), plus optional day-level
 * totals (#549/#582) for protein/fat/carbs/fiber. Undefined (not 0) when
 * neither meals nor dayTotals logged that macro — distinct from "logged
 * zero", same convention as totalCalories(). Items that didn't log this
 * particular macro are simply skipped, not treated as zero. */
function totalMacro(
  entries: CalorieEntry[] | undefined,
  field: MacroField,
  dayTotals?: DayTotals,
): number | undefined {
  const values = (entries ?? [])
    .flatMap((entry) => entry.items)
    .map((item) => item[field])
    .filter((value): value is number => value !== undefined)
  const dayValue =
    field === 'proteinG' ||
    field === 'fatG' ||
    field === 'carbsG' ||
    field === 'fiberG'
      ? dayTotals?.[field]
      : undefined
  const hasMeal = values.length > 0
  const hasDay = dayValue !== undefined
  if (!hasMeal && !hasDay) return undefined
  const mealSum = hasMeal ? values.reduce((sum, value) => sum + value, 0) : 0
  return mealSum + (dayValue ?? 0)
}

export function totalProtein(
  entries: CalorieEntry[] | undefined,
  dayTotals?: DayTotals,
): number | undefined {
  return totalMacro(entries, 'proteinG', dayTotals)
}

export function totalFat(
  entries: CalorieEntry[] | undefined,
  dayTotals?: DayTotals,
): number | undefined {
  return totalMacro(entries, 'fatG', dayTotals)
}

export function totalCarbs(
  entries: CalorieEntry[] | undefined,
  dayTotals?: DayTotals,
): number | undefined {
  return totalMacro(entries, 'carbsG', dayTotals)
}

/** #341 — same shape as the three above; #582 also adds dayTotals.fiberG. */
export function totalFiber(
  entries: CalorieEntry[] | undefined,
  dayTotals?: DayTotals,
): number | undefined {
  return totalMacro(entries, 'fiberG', dayTotals)
}

/** #530 — electrolytes in milligrams; same undefined-vs-zero rules. */
export function totalSodium(
  entries: CalorieEntry[] | undefined,
): number | undefined {
  return totalMacro(entries, 'sodiumMg')
}

export function totalPotassium(
  entries: CalorieEntry[] | undefined,
): number | undefined {
  return totalMacro(entries, 'potassiumMg')
}

export function totalMagnesium(
  entries: CalorieEntry[] | undefined,
): number | undefined {
  return totalMacro(entries, 'magnesiumMg')
}
