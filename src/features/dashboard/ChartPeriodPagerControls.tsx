import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatLocalizedDateRange, useLocale, useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import type { ChartPeriodPager } from './useChartPeriodPager'

/**
 * #443 — prev/next arrows for one chart's own `useChartPeriodPager`, shared
 * across the 4 main trend charts rather than duplicated in each (they're
 * otherwise identical markup). Renders nothing when `pager.showPager` is
 * false ('all'/'custom' periods, or no `period` prop passed at all) so a
 * chart's footer looks exactly as it did before #443 in that case.
 *
 * #957 — range dates use `formatLocalizedDate` (`PP`), same as chart axes.
 * Overlap is prevented by thinning axis ticks, not by a numeric one-off.
 */
export function ChartPeriodPagerControls({ pager }: { pager: ChartPeriodPager }) {
  const t = useTranslation()
  const locale = useLocale()
  if (!pager.showPager) return null

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t.dashboard.previousPeriodLabel}
        disabled={!pager.canGoPrev}
        onClick={pager.goPrev}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span>
        {pager.range.start &&
          pager.range.end &&
          formatLocalizedDateRange(pager.range.start, pager.range.end, locale)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t.dashboard.nextPeriodLabel}
        disabled={!pager.canGoNext}
        onClick={pager.goNext}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  )
}
