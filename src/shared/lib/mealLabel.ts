import { adjustForDayStart } from '@/domain/stats/dayStart'
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

/**
 * Historical rows (and some JSON backups) stored meal-slot ids as numbers
 * (#579). Domain callers type `label?: string`, but IndexedDB may still
 * hold a number until the next import/rewrite — coerce before `.trim()`
 * so Dashboard correlation readers (#580/#587) do not crash.
 */
function coerceMealLabel(
  label: string | number | undefined | null,
): string | undefined {
  if (label == null) return undefined
  return typeof label === 'string' ? label : String(label)
}

/** A meal group's actual effective display name — its custom label (#110)
 * when one was set, else the positional default above. Empty string is
 * treated like unset so a cleared-then-saved name still re-translates (#141). */
export function effectiveMealLabel(
  t: Dictionary,
  position: number,
  label: string | number | undefined,
): string {
  const text = coerceMealLabel(label)
  if (text == null || text.trim() === '') return defaultMealLabel(t, position)
  return text
}

/**
 * Value for the Add/Edit meal name field (#568) — unlike
 * `effectiveMealLabel`, an explicit empty string stays empty so clearing
 * the field does not reseed the positional default mid-typing.
 */
export function editableMealLabel(
  t: Dictionary,
  position: number,
  label: string | number | undefined,
): string {
  const text = coerceMealLabel(label)
  return text !== undefined ? text : defaultMealLabel(t, position)
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
  label: string | number | undefined,
): MealSlotKey | undefined {
  const text = coerceMealLabel(label)
  if (text == null || text.trim() === '') return undefined
  return MEAL_LABEL_TO_SLOT[text.trim().toLowerCase()]
}

/**
 * #580/#588 — default HH:MM for a known meal-slot label when `timeEaten`
 * is blank. Pass remembered prefs from `useMealSlotDefaultTimesStore`;
 * omit to use the built-in clocks.
 */
export function defaultTimeEatenForMealLabel(
  label: string | number | undefined,
  slotTimes: MealSlotDefaultTimes = BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
): string | undefined {
  const slot = mealSlotKeyForLabel(label)
  return slot ? slotTimes[slot] : undefined
}

/** Recorded time, else a slot default from the meal label (#580/#588). */
export function effectiveTimeEaten(
  meal: {
    timeEaten?: string
    label?: string | number
  },
  slotTimes: MealSlotDefaultTimes = BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
): string | undefined {
  return meal.timeEaten ?? defaultTimeEatenForMealLabel(meal.label, slotTimes)
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * #597 — Day meal cards: earliest effective clock first; meals with no
 * resolvable time stay at the end (stable among ties). #621: reported
 * live — a meal logged at 01:00 sorted *first*, ahead of the same day's
 * 14:09/15:23 meals, when it was actually the last meal of a late-night
 * session. `dayStartTime` (default `'00:00'`, purely additive — every
 * pre-#621 caller keeps today's exact behavior) shifts late-night clocks
 * a full day later before comparing (`adjustForDayStart`, cap 06:00 —
 * #755), so a post-midnight entry sorts after the evening it actually
 * followed, while an 08:27 breakfast stays before 11:00.
 */
export function sortCalorieEntriesByLoggedTime<
  T extends { timeEaten?: string; label?: string | number },
>(
  entries: readonly T[],
  slotTimes: MealSlotDefaultTimes = BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
  dayStartTime = '00:00',
): T[] {
  const dayStartMinutes = timeToMinutes(dayStartTime)
  return entries
    .map((entry, index) => ({
      entry,
      index,
      time: effectiveTimeEaten(entry, slotTimes),
    }))
    .sort((a, b) => {
      if (a.time == null && b.time == null) return a.index - b.index
      if (a.time == null) return 1
      if (b.time == null) return -1
      const aMinutes = adjustForDayStart(timeToMinutes(a.time), dayStartMinutes)
      const bMinutes = adjustForDayStart(timeToMinutes(b.time), dayStartMinutes)
      return aMinutes !== bMinutes ? aMinutes - bMinutes : a.index - b.index
    })
    .map(({ entry }) => entry)
}
