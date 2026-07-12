import type { Locale } from './localeStore'

/** Locale-aware number formatting (decimal separator: '.' for en, ',' for ru). */
export function formatNumber(
  value: number,
  locale: Locale,
  fractionDigits = 1,
): string {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
