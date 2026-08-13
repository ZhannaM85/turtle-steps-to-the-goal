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

function scaleOptional(value: number | undefined, scale: number): number | undefined {
  return value === undefined ? undefined : Math.round(value * scale * 10) / 10
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
 * a portion count. #530 — optional sodium/potassium/magnesium per-100g
 * rates scale the same way as fiber. */
export function scaleFromPer100g(
  kcal100: number,
  protein100: number | undefined,
  fat100: number | undefined,
  carbs100: number | undefined,
  rawPortions: string,
  fiber100?: number,
  sodium100?: number,
  potassium100?: number,
  magnesium100?: number,
): {
  amountKcal: number
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
  amountG: number
  fiberG: number | undefined
  sodiumMg: number | undefined
  potassiumMg: number | undefined
  magnesiumMg: number | undefined
} {
  const parsedPortions = parseNumberInput(rawPortions)
  const portions = parsedPortions && parsedPortions > 0 ? parsedPortions : 1
  const scale = portions
  return {
    amountKcal: Math.round(kcal100 * scale),
    proteinG: scaleOptional(protein100, scale),
    fatG: scaleOptional(fat100, scale),
    carbsG: scaleOptional(carbs100, scale),
    amountG: Math.round(portions * 100 * 10) / 10,
    fiberG: scaleOptional(fiber100, scale),
    sodiumMg: scaleOptional(sodium100, scale),
    potassiumMg: scaleOptional(potassium100, scale),
    magnesiumMg: scaleOptional(magnesium100, scale),
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

/** Inverse of `portionsToGrams` above (#457) — converts a raw grams field
 * (Portion mode's own optional weight, not a portions count) back to a
 * portions count for per-100g mode's own field. Unlike `portionsToGrams`,
 * always returns a number (defaulting invalid/blank input to 1, i.e.
 * 100g) rather than `undefined` — same "no weight recorded" → "1 portion"
 * fallback `ratesFromAbsolute`'s own grams defaulting already uses, since
 * this feeds a field that's always shown a concrete number. */
export function gramsToPortions(rawGrams: string): number {
  const parsedGrams = parseOptionalMacro(rawGrams)
  return parsedGrams && parsedGrams > 0 ? parsedGrams / 100 : 1
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
  fiberG?: number,
  sodiumMg?: number,
  potassiumMg?: number,
  magnesiumMg?: number,
): {
  kcal100: number
  protein100: number | undefined
  fat100: number | undefined
  carbs100: number | undefined
  portions: number
  fiber100: number | undefined
  sodium100: number | undefined
  potassium100: number | undefined
  magnesium100: number | undefined
} {
  const grams = amountG && amountG > 0 ? amountG : 100
  const portions = grams / 100
  const scale = 1 / portions
  return {
    kcal100: Math.round(amountKcal * scale),
    protein100: scaleOptional(proteinG, scale),
    fat100: scaleOptional(fatG, scale),
    carbs100: scaleOptional(carbsG, scale),
    portions,
    fiber100: scaleOptional(fiberG, scale),
    sodium100: scaleOptional(sodiumMg, scale),
    potassium100: scaleOptional(potassiumMg, scale),
    magnesium100: scaleOptional(magnesiumMg, scale),
  }
}

/** #715 — rescale absolute portion-mode totals when the user changes
 * weight (g). Density stays the source of truth: 280 kcal @ 50g → 112
 * kcal @ 20g (still 560 kcal/100g), instead of freezing 280 and later
 * back-calculating a fake 1400 kcal/100g on a mode switch. Returns
 * `null` when either weight is missing/non-positive so a blank or
 * mid-clear edit does not invent numbers. Callers that need mid-typing
 * stability should scale from a fixed baseline (grams + totals at last
 * nutrition edit), not from the previous keystroke's grams. */
export function scaleTotalsByWeightChange(
  amountKcal: number,
  proteinG: number | undefined,
  fatG: number | undefined,
  carbsG: number | undefined,
  previousGrams: number,
  nextGrams: number,
  fiberG?: number,
  sodiumMg?: number,
  potassiumMg?: number,
  magnesiumMg?: number,
): {
  amountKcal: number
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
  fiberG: number | undefined
  sodiumMg: number | undefined
  potassiumMg: number | undefined
  magnesiumMg: number | undefined
} | null {
  if (!(previousGrams > 0) || !(nextGrams > 0)) return null
  const scale = nextGrams / previousGrams
  return {
    amountKcal: Math.round(amountKcal * scale),
    proteinG: scaleOptional(proteinG, scale),
    fatG: scaleOptional(fatG, scale),
    carbsG: scaleOptional(carbsG, scale),
    fiberG: scaleOptional(fiberG, scale),
    sodiumMg: scaleOptional(sodiumMg, scale),
    potassiumMg: scaleOptional(potassiumMg, scale),
    magnesiumMg: scaleOptional(magnesiumMg, scale),
  }
}

/** "Per portion" mode's entry math (#111) — an alternative to
 * `scaleFromPer100g` for when the user knows a meal's actual total
 * (e.g. "this sandwich is 450 kcal") but not its per-100g rate. No
 * multiplication at save time: the typed numbers already are the total
 * (#715 rescales those typed totals in the UI when weight changes, so
 * `amountG` is no longer a pure inert memory aid while editing — it
 * still does not multiply again here). `amountG` stays optional, not
 * defaulted to 100. */
export function totalFromPortion(
  amountKcal: number,
  proteinG: number | undefined,
  fatG: number | undefined,
  carbsG: number | undefined,
  rawAmountG: string,
  fiberG?: number,
  sodiumMg?: number,
  potassiumMg?: number,
  magnesiumMg?: number,
): {
  amountKcal: number
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
  amountG: number | undefined
  fiberG: number | undefined
  sodiumMg: number | undefined
  potassiumMg: number | undefined
  magnesiumMg: number | undefined
} {
  return {
    amountKcal,
    proteinG,
    fatG,
    carbsG,
    amountG: parseOptionalMacro(rawAmountG),
    fiberG,
    sodiumMg,
    potassiumMg,
    magnesiumMg,
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
