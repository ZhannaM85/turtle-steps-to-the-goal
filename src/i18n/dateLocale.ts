import { format, parseISO } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'
import type { Locale } from './localeStore'

/** date-fns locale object for human-readable date formatting (month names, weekday labels, etc). */
export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return locale === 'ru' ? ru : enUS
}

function parseIsoDate(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const parsed = parseISO(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

/** Closed-state date label for `#882` — follows Settings language, not OS. */
export function formatLocalizedDate(isoDate: string, locale: Locale): string {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return ''
  return format(parsed, 'PP', { locale: getDateFnsLocale(locale) })
}

/** #953 — compact axis date (`03/01/2026` / `01.03.2026`). */
export function formatLocalizedShortDate(
  isoDate: string,
  locale: Locale,
): string {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return ''
  return format(parsed, 'P', { locale: getDateFnsLocale(locale) })
}
