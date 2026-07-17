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

/** Scales per-100g rates by quantity (#96) — the same math
 * `FoodPickerDialog` already uses for curated foods, driving manual
 * entry's kcal/protein/fat/carbs fields (per-100g rates) plus a quantity
 * field everywhere else in the app (`DailyEntryForm`'s add row and
 * item-edit rows, `MealItemsSection`'s custom-item editor, #99), instead
 * of typing the eaten totals directly. An invalid/blank quantity defaults
 * to 100 rather than blocking Add — that makes the rate *equal* the
 * total, i.e. behaves exactly like "type the total directly" when the
 * quantity is left untouched. */
export function scaleFromPer100g(
  kcal100: number,
  protein100: number | undefined,
  fat100: number | undefined,
  carbs100: number | undefined,
  rawQuantity: string,
): {
  amountKcal: number
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
  amountG: number
} {
  const parsedQuantity = parseNumberInput(rawQuantity)
  const quantity = parsedQuantity && parsedQuantity > 0 ? parsedQuantity : 100
  const scale = quantity / 100
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
    amountG: quantity,
  }
}

/** Inverse of `scaleFromPer100g` (#96) — reconstructs per-100g rates and
 * the quantity they came from, to prefill an edit row or an autocomplete
 * restore from previously-stored absolute totals. A total with no
 * recorded quantity (created before #93/#96) is treated as quantity 100,
 * so it becomes the per-100g rate unchanged — same numbers as before this
 * feature existed, just reframed as a rate. */
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
  quantity: number
} {
  const quantity = amountG && amountG > 0 ? amountG : 100
  const scale = 100 / quantity
  return {
    kcal100: Math.round(amountKcal * scale),
    protein100:
      proteinG === undefined
        ? undefined
        : Math.round(proteinG * scale * 10) / 10,
    fat100: fatG === undefined ? undefined : Math.round(fatG * scale * 10) / 10,
    carbs100:
      carbsG === undefined ? undefined : Math.round(carbsG * scale * 10) / 10,
    quantity,
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
