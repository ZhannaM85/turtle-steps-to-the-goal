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

/** Same as formatNumber, but always shows an explicit +/- sign — for deltas. */
export function formatSignedNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}
