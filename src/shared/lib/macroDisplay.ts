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

/** "2000ml" / "2000мл", mirroring formatMacroGrams above but for water's
 * volume unit instead of a gram weight (#328). */
export function formatMl(
  ml: number | undefined,
  locale: Locale,
  t: Dictionary,
): string {
  return ml === undefined
    ? '—'
    : `${formatNumber(ml, locale, 0)}${t.dailyEntry.mlUnit}`
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

/** Single-initial variant ("P 20g · F 10g · C —") for the History table's
 * Calories cell — kept to `whitespace-nowrap` there, so the full-word form
 * was wide enough to push the Actions column (expand/edit/delete) off
 * screen on narrow phones. Today's form and the calendar's DayDetail panel
 * have room to spare and keep the full-word `macrosSummaryText` above. */
export function macrosSummaryTextCompact(
  proteinG: number | undefined,
  fatG: number | undefined,
  carbsG: number | undefined,
  locale: Locale,
  t: Dictionary,
): string | null {
  if (proteinG === undefined && fatG === undefined && carbsG === undefined) {
    return null
  }
  return t.dailyEntry.macrosSummaryCompact(
    formatMacroGrams(proteinG, locale, t),
    formatMacroGrams(fatG, locale, t),
    formatMacroGrams(carbsG, locale, t),
  )
}
