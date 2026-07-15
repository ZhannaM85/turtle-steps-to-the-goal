import type { Dictionary, Locale } from '@/i18n'
import { formatNumber } from '@/i18n'

/** "20g" / "20г" for a logged macro, or an em dash when that particular
 * macro wasn't logged (#51) — distinct from "0g". */
export function formatMacroGrams(
  grams: number | undefined,
  locale: Locale,
  t: Dictionary,
): string {
  return grams === undefined
    ? '—'
    : `${formatNumber(grams, locale, 0)}${t.dailyEntry.gramsUnit}`
}

/** "Protein 20g · Fat 10g · Carbs —", or null when none of the three were
 * logged at all — callers should render nothing in that case rather than
 * an all-dashes line (#51/#52). */
export function macrosSummaryText(
  proteinG: number | undefined,
  fatG: number | undefined,
  carbsG: number | undefined,
  locale: Locale,
  t: Dictionary,
): string | null {
  if (proteinG === undefined && fatG === undefined && carbsG === undefined) {
    return null
  }
  return t.dailyEntry.macrosSummary(
    formatMacroGrams(proteinG, locale, t),
    formatMacroGrams(fatG, locale, t),
    formatMacroGrams(carbsG, locale, t),
  )
}
