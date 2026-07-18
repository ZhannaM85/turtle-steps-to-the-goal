import type { Dictionary } from '@/i18n'

/**
 * The positional default for a meal group's name (#141) — Breakfast/Lunch/
 * Dinner/Snack for the first 4 meals of a day (the same translated names
 * `dailyEntry.defaultMealNamePresets` already offers as quick-pick presets
 * in Settings), falling back to the original positional "Meal N" from the
 * 5th meal onward, where a default name stops being a safe assumption.
 */
export function defaultMealLabel(t: Dictionary, position: number): string {
  return (
    t.dailyEntry.defaultMealNamePresets[position - 1] ??
    t.dailyEntry.mealLabel(position)
  )
}

/** A meal group's actual effective display name — its custom label (#110)
 * when one was set, else the positional default above. */
export function effectiveMealLabel(
  t: Dictionary,
  position: number,
  label: string | undefined,
): string {
  return label ?? defaultMealLabel(t, position)
}
