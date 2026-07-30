import { format, subDays } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'

/**
 * #380 — which window Dashboard's main trend charts (Weight/Calorie/Macro/
 * Body composition) show, resolved via `AskUserQuestion`: one global
 * control rather than a picker per chart, mirroring #240's "Export period"
 * shape. `'all'` (the default, matching every chart's pre-#380 behavior
 * exactly) plus three rolling windows anchored to today, plus an arbitrary
 * user-picked range. Deliberately rolling (last N days from today), not
 * calendar-aligned (a fixed Jan-Dec year etc.) — matches how a typical
 * "1W/1M/1Y" chart-period control works elsewhere, and needs no separate
 * "which week/month/year" sub-picker of its own.
 */
export type TrendChartPeriod = 'all' | 'week' | 'month' | 'year' | 'custom'

export interface TrendChartPeriodRange {
  /** Inclusive lower bound, `null` meaning unbounded. */
  start: string | null
  /** Inclusive upper bound, `null` meaning unbounded. */
  end: string | null
}

// #443 — exported so `useChartPeriodPager` can page a chart's own anchor
// backward/forward by exactly one window's worth of days, reusing the same
// window sizes this file already defines rather than duplicating them.
export const ROLLING_WINDOW_DAYS: Record<'week' | 'month' | 'year', number> = {
  week: 6,
  month: 29,
  year: 364,
}

/** Only Week/Month/Year are rolling windows anchored to "today" -- 'all' has
 * no natural "next unit" and 'custom' is already an arbitrary user-picked
 * range, so neither has a meaningful "page to the next one" action (#443). */
export function isPageableTrendChartPeriod(
  period: TrendChartPeriod,
): period is 'week' | 'month' | 'year' {
  return period === 'week' || period === 'month' || period === 'year'
}

/**
 * Resolves the selected period into a concrete `[start, end]` range.
 * `customStart`/`customEnd` are only consulted for `'custom'` — same
 * "blank means unbounded on that side" convention #240's export period
 * picker already established, so a half-picked custom range still filters
 * usefully rather than requiring both dates before doing anything.
 */
export function resolveTrendChartPeriodRange(
  period: TrendChartPeriod,
  customStart: string,
  customEnd: string,
  today: Date = new Date(),
): TrendChartPeriodRange {
  if (period === 'all') return { start: null, end: null }
  if (period === 'custom') {
    return { start: customStart || null, end: customEnd || null }
  }
  const todayIso = format(today, 'yyyy-MM-dd')
  return {
    start: format(subDays(today, ROLLING_WINDOW_DAYS[period]), 'yyyy-MM-dd'),
    end: todayIso,
  }
}

/** Filters entries to a resolved range — both bounds `null` (the `'all'`
 * case, or an untouched custom range) returns `entries` unchanged. */
export function filterEntriesByTrendChartPeriod(
  entries: DailyEntry[],
  range: TrendChartPeriodRange,
): DailyEntry[] {
  if (!range.start && !range.end) return entries
  return entries.filter(
    (entry) =>
      (!range.start || entry.date >= range.start) &&
      (!range.end || entry.date <= range.end),
  )
}
