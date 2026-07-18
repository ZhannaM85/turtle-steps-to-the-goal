import type { Dictionary, Locale } from '@/i18n'
import { formatNumber } from '@/i18n'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'

// Macros are optional supplementary data (#51) with no per-field error UI,
// unlike kcal's required-and-guarded amount — invalid/garbage input (NaN)
// or a negative number is silently treated as "not provided" rather than
// surfacing a validation error for a low-stakes field.
export function parseOptionalMacro(raw: string): number | undefined {
  const parsed = parseNumberInput(raw)
  return parsed !== undefined && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : undefined
}

/** Scales per-100g rates by a count of 100g portions (#96, reframed by
 * #140) — driving manual entry's kcal/protein/fat/carbs fields (per-100g
 * rates) plus a portions field everywhere else in the app
 * (`DailyEntryForm`'s add row and item-edit rows, `MealItemsSection`'s
 * custom-item editor, #99). #140: the field is typed as "how many 100g
 * portions" (e.g. "2" for 200g, "1.5" for 150g), matching how nutrition
 * labels are usually printed, rather than the raw gram total — an invalid
 * or blank count defaults to `1` (i.e. 100g) rather than blocking Add,
 * same "untouched input behaves like typing the total" guarantee the old
 * grams-default-100 had. `amountG` stays real grams (portions × 100)
 * since everything downstream (export, `CalorieItem.amountG`,
 * `ratesFromAbsolute` below) still reads/writes true portion weight, not
 * a portion count. */
export function scaleFromPer100g(
  kcal100: number,
  protein100: number | undefined,
  fat100: number | undefined,
  carbs100: number | undefined,
  rawPortions: string,
): {
  amountKcal: number
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
  amountG: number
} {
  const parsedPortions = parseNumberInput(rawPortions)
  const portions = parsedPortions && parsedPortions > 0 ? parsedPortions : 1
  const scale = portions
  return {
    amountKcal: Math.round(kcal100 * scale),
    proteinG:
      protein100 === undefined
        ? undefined
        : Math.round(protein100 * scale * 10) / 10,
    fatG:
      fat100 === undefined ? undefined : Math.round(fat100 * scale * 10) / 10,
    carbsG:
      carbs100 === undefined
        ? undefined
        : Math.round(carbs100 * scale * 10) / 10,
    amountG: Math.round(portions * 100 * 10) / 10,
  }
}

/** Converts a raw "count of 100g portions" field (#140) to real grams, for
 * the two mode-switch conversions (`handleAddMacroModeChange`,
 * `updateEditItemMode` in `DailyEntryForm.tsx`) that need to feed a
 * portions field's current value into `ratesFromAbsolute`, which still
 * expects true grams — it's also fed directly from domain data elsewhere
 * (`CalorieItem.amountG`, `MealItem.lastAmountG`) that were never in
 * portions to begin with. */
export function portionsToGrams(rawPortions: string): number | undefined {
  const parsedPortions = parseOptionalMacro(rawPortions)
  return parsedPortions === undefined ? undefined : parsedPortions * 100
}

/** Inverse of `scaleFromPer100g` (#96) — reconstructs per-100g rates and
 * the portion count they came from, to prefill an edit row or an
 * autocomplete restore from previously-stored absolute totals (`amountG`
 * here is always true grams — a domain field, never itself a portion
 * count). A total with no recorded grams (created before #93/#96, or an
 * old row from before #140 reframed the field) is treated as 100g/1
 * portion, so it becomes the per-100g rate unchanged — same numbers as
 * before this feature existed, just reframed as a rate. */
export function ratesFromAbsolute(
  amountKcal: number,
  proteinG: number | undefined,
  fatG: number | undefined,
  carbsG: number | undefined,
  amountG: number | undefined,
): {
  kcal100: number
  protein100: number | undefined
  fat100: number | undefined
  carbs100: number | undefined
  portions: number
} {
  const grams = amountG && amountG > 0 ? amountG : 100
  const portions = grams / 100
  const scale = 1 / portions
  return {
    kcal100: Math.round(amountKcal * scale),
    protein100:
      proteinG === undefined
        ? undefined
        : Math.round(proteinG * scale * 10) / 10,
    fat100: fatG === undefined ? undefined : Math.round(fatG * scale * 10) / 10,
    carbs100:
      carbsG === undefined ? undefined : Math.round(carbsG * scale * 10) / 10,
    portions,
  }
}

/** "Per portion" mode's entry math (#111) — an alternative to
 * `scaleFromPer100g` for when the user knows a meal's actual total
 * (e.g. "this sandwich is 450 kcal") but not its per-100g rate. No
 * multiplication: the typed numbers already are the total. `amountG`
 * reverts to being a pure memory aid here (#93's original inert
 * behavior), not a multiplier — optional, not defaulted to 100. */
export function totalFromPortion(
  amountKcal: number,
  proteinG: number | undefined,
  fatG: number | undefined,
  carbsG: number | undefined,
  rawAmountG: string,
): {
  amountKcal: number
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
  amountG: number | undefined
} {
  return {
    amountKcal,
    proteinG,
    fatG,
    carbsG,
    amountG: parseOptionalMacro(rawAmountG),
  }
}

/** Live preview text for a `scaleFromPer100g` result (#98) — e.g.
 * "300 kcal · P 20g · F 5g · C 2g" — the exact numbers that will actually
 * get saved, so the multiplication is visible before Add/Save rather than
 * only after. */
export function formatComputedTotal(
  scaled: {
    amountKcal: number
    proteinG: number | undefined
    fatG: number | undefined
    carbsG: number | undefined
  },
  locale: Locale,
  t: Dictionary,
): string {
  const kcalText = `${formatNumber(scaled.amountKcal, locale, 0)} ${t.dailyEntry.kcalUnit}`
  const macros = macrosSummaryTextCompact(
    scaled.proteinG,
    scaled.fatG,
    scaled.carbsG,
    locale,
    t,
  )
  return macros ? `${kcalText} · ${macros}` : kcalText
}
