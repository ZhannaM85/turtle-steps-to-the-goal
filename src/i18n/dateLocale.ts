import { format, parseISO } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'
import type { Locale } from './localeStore'

/** date-fns locale object for human-readable date formatting (month names, weekday labels, etc). */
export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return locale === 'ru' ? ru : enUS
}

/** Closed-state date label for `#882` — follows Settings language, not OS. */
export function formatLocalizedDate(isoDate: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return ''
  const parsed = parseISO(isoDate)
  if (Number.isNaN(parsed.getTime())) return ''
  return format(parsed, 'PP', { locale: getDateFnsLocale(locale) })
}
