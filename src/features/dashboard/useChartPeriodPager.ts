import { useState } from 'react'
import { addDays } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  filterEntriesByTrendChartPeriod,
  isPageableTrendChartPeriod,
  resolveTrendChartPeriodRange,
  ROLLING_WINDOW_DAYS,
  type TrendChartPeriod,
  type TrendChartPeriodRange,
} from '@/domain/stats'

export interface ChartPeriodPager {
  pagedEntries: DailyEntry[]
  range: TrendChartPeriodRange
  showPager: boolean
  canGoPrev: boolean
  canGoNext: boolean
  goPrev: () => void
  goNext: () => void
}

/**
 * #443 — requested live: no way to step to the previous/next week/month/
 * year on the Dashboard's main trend charts, only the fixed #380/#396
 * period picker. Resolved via `AskUserQuestion`: the period *type*
 * (Week/Month/Year) stays that one shared, global control, but *which*
 * window of that type each chart currently shows is each chart's own local
 * state — one person might page the Weight chart back to a past month
 * while the Calorie chart next to it stays on the current one. So this
 * hook is called independently by each of the 4 main trend charts, not
 * lifted into shared/store state.
 *
 * `entries` must be the *full*, not period-filtered, set — paging needs
 * access to days outside whatever window `DashboardScreen` originally
 * resolved. For 'all'/'custom' (see `isPageableTrendChartPeriod`'s own
 * comment for why neither pages) this reduces to exactly the same
 * `resolveTrendChartPeriodRange`/`filterEntriesByTrendChartPeriod` call
 * `DashboardScreen` used to make on the chart's behalf, so a chart that
 * never passes an explicit `period` (every pre-#443 test) behaves
 * identically to before.
 */
export function useChartPeriodPager(
  period: TrendChartPeriod,
  customStart: string,
  customEnd: string,
  entries: DailyEntry[],
  // Injectable, same as `resolveTrendChartPeriodRange`'s own `today` param —
  // lets tests pin "today" instead of depending on the real system clock.
  today: Date = new Date(),
): ChartPeriodPager {
  const [periodsBack, setPeriodsBack] = useState(0)
  // Switching the shared period *type* mid-page (e.g. Month -> Week) leaves
  // an offset that no longer means the same thing against the new window
  // size -- reset to "current" rather than carry a stale count forward.
  // Reset during render (comparing against the last-seen `period`) rather
  // than in a `useEffect`, per React's own guidance against synchronous
  // `setState` inside an effect -- avoids the extra render pass an effect
  // would cost.
  const [prevPeriod, setPrevPeriod] = useState(period)
  if (period !== prevPeriod) {
    setPrevPeriod(period)
    setPeriodsBack(0)
  }

  if (!isPageableTrendChartPeriod(period)) {
    const range = resolveTrendChartPeriodRange(period, customStart, customEnd)
    return {
      pagedEntries: filterEntriesByTrendChartPeriod(entries, range),
      range,
      showPager: false,
      canGoPrev: false,
      canGoNext: false,
      goPrev: () => {},
      goNext: () => {},
    }
  }

  const windowSpanDays = ROLLING_WINDOW_DAYS[period] + 1
  const anchor = addDays(today, -periodsBack * windowSpanDays)
  const range = resolveTrendChartPeriodRange(period, '', '', anchor)
  const pagedEntries = filterEntriesByTrendChartPeriod(entries, range)

  return {
    pagedEntries,
    range,
    showPager: true,
    canGoPrev: entries.some(
      (entry) => range.start !== null && entry.date < range.start,
    ),
    canGoNext: periodsBack > 0,
    goPrev: () => setPeriodsBack((n) => n + 1),
    goNext: () => setPeriodsBack((n) => Math.max(0, n - 1)),
  }
}
