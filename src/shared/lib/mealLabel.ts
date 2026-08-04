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

/** #580/#588 — the four named meal slots that get a default clock time. */
export type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MealSlotDefaultTimes = Record<MealSlotKey, string>

/**
 * #580 built-in clocks — used until the user sets remembered prefs (#588)
 * on import or in Settings. Kept as the pure-function default so domain
 * callers without store access stay deterministic in tests.
 */
export const BUILTIN_MEAL_SLOT_DEFAULT_TIMES: MealSlotDefaultTimes = {
  breakfast: '08:00',
  lunch: '13:00',
  dinner: '19:00',
  snack: '16:00',
}

/**
 * Lowercased meal-slot labels → slot key. Includes RU presets and MFP's
 * plural "Snacks" (#580).
 */
const MEAL_LABEL_TO_SLOT: Record<string, MealSlotKey> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack',
  snacks: 'snack',
  завтрак: 'breakfast',
  обед: 'lunch',
  ужин: 'dinner',
  перекус: 'snack',
}

export function mealSlotKeyForLabel(
  label: string | undefined,
): MealSlotKey | undefined {
  if (label == null || label.trim() === '') return undefined
  return MEAL_LABEL_TO_SLOT[label.trim().toLowerCase()]
}

/**
 * #580/#588 — default HH:MM for a known meal-slot label when `timeEaten`
 * is blank. Pass remembered prefs from `useMealSlotDefaultTimesStore`;
 * omit to use the built-in clocks.
 */
export function defaultTimeEatenForMealLabel(
  label: string | undefined,
  slotTimes: MealSlotDefaultTimes = BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
): string | undefined {
  const slot = mealSlotKeyForLabel(label)
  return slot ? slotTimes[slot] : undefined
}

/** Recorded time, else a slot default from the meal label (#580/#588). */
export function effectiveTimeEaten(
  meal: {
    timeEaten?: string
    label?: string
  },
  slotTimes: MealSlotDefaultTimes = BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
): string | undefined {
  return meal.timeEaten ?? defaultTimeEatenForMealLabel(meal.label, slotTimes)
}
