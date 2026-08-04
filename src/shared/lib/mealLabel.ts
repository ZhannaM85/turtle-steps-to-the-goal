import { getDictionary, type Dictionary, type Locale } from '@/i18n'

const ALL_LOCALES: Locale[] = ['en', 'ru']

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
 * when one was set, else the positional default above. Empty string is
 * treated like unset so a cleared-then-saved name still re-translates (#141). */
export function effectiveMealLabel(
  t: Dictionary,
  position: number,
  label: string | undefined,
): string {
  if (label == null || label.trim() === '') return defaultMealLabel(t, position)
  return label
}

/**
 * Value for the Add/Edit meal name field (#568) — unlike
 * `effectiveMealLabel`, an explicit empty string stays empty so clearing
 * the field does not reseed the positional default mid-typing.
 */
export function editableMealLabel(
  t: Dictionary,
  position: number,
  label: string | undefined,
): string {
  return label !== undefined ? label : defaultMealLabel(t, position)
}

/** Built-in Breakfast/Lunch/… names in every locale — used to hide
 * other-locale defaults from Add-meal chips (#567). */
export function allLocaleDefaultMealNames(): Set<string> {
  return new Set(
    ALL_LOCALES.flatMap(
      (locale) => getDictionary(locale).dailyEntry.defaultMealNamePresets,
    ),
  )
}

/**
 * #563/#567 — active-locale defaults first, then custom Settings presets
 * that are not a built-in default in any locale (so EN leftovers don't
 * appear beside RU chips after a language switch).
 */
export function mealLabelSuggestionsForLocale(
  t: Dictionary,
  presets: readonly string[],
): string[] {
  const builtIns = allLocaleDefaultMealNames()
  return [
    ...t.dailyEntry.defaultMealNamePresets,
    ...presets.filter((preset) => !builtIns.has(preset)),
  ]
}

/**
 * #580 — sensible default HH:MM for a known meal-slot label when the
 * export/import left `timeEaten` blank (MyFitnessPal Foods rows have
 * Breakfast/Lunch/Dinner/Snacks but no clock time). Keys are lowercased;
 * includes RU presets and MFP's plural "Snacks".
 */
const MEAL_SLOT_DEFAULT_TIME_HHMM: Record<string, string> = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '19:00',
  snack: '16:00',
  snacks: '16:00',
  завтрак: '08:00',
  обед: '13:00',
  ужин: '19:00',
  перекус: '16:00',
}

export function defaultTimeEatenForMealLabel(
  label: string | undefined,
): string | undefined {
  if (label == null || label.trim() === '') return undefined
  return MEAL_SLOT_DEFAULT_TIME_HHMM[label.trim().toLowerCase()]
}

/** Recorded time, else a slot default from the meal label (#580). */
export function effectiveTimeEaten(meal: {
  timeEaten?: string
  label?: string
}): string | undefined {
  return meal.timeEaten ?? defaultTimeEatenForMealLabel(meal.label)
}
