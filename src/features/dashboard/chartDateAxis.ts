import { formatLocalizedDate, CHART_DATE_TICK_MIN_GAP_PX, type Locale } from '@/i18n'

/** #957 — shared Recharts X-axis skip + `PP` tick labels. */
export function chartDateXAxisProps(locale: Locale) {
  return {
    interval: 'preserveStartEnd' as const,
    minTickGap: CHART_DATE_TICK_MIN_GAP_PX,
    tickFormatter: (date: string) => formatLocalizedDate(date, locale),
  }
}
