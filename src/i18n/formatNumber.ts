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

/**
 * For values that were directly entered (or are a plain subtraction of two
 * entered values), where rounding to a fixed decimal count would show
 * something other than what the user typed (#57). No minimum — a whole
 * number stays "60", not "60.0" — and a max of 2 both covers typical
 * entered precision and guards against floating-point noise from
 * subtraction (e.g. `59.25 - 58.1` is `1.1499999999999986` in JS, but
 * Intl rounds that to "1.15" correctly).
 */
export function formatExactNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}
