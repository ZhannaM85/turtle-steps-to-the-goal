import { formatNumber, type Locale } from '@/i18n'

/** #596 — room for locale one-decimal ticks like `-12.5` / `-12,5`. */
export const CORRELATION_SCATTER_Y_AXIS_WIDTH = 52

/** #596 — one digit after the decimal on correlation scatter axis ticks. */
export function formatCorrelationScatterTick(
  value: number,
  locale: Locale,
): string {
  return formatNumber(value, locale, 1)
}
