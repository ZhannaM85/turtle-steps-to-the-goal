import { enUS, ru } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'
import type { Locale } from './localeStore'

/** date-fns locale object for human-readable date formatting (month names, weekday labels, etc). */
export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return locale === 'ru' ? ru : enUS
}
