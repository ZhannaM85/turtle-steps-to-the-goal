import { useTranslation } from '@/i18n'
import { type TrendChartPeriod } from '@/domain/stats'
import { useDashboardPeriodStore } from '@/stores'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

/**
 * #380 — one global period control above the Weight/Calorie/Macro/Body
 * composition trend charts (resolved via `AskUserQuestion`: one shared
 * control rather than a picker per chart). Deliberately scoped to just
 * those 4 charts, not the correlation views (their own day/week-count
 * caveats already describe a full-history sample size, changing that
 * would change what the underlying statistic even means) or
 * `CustomChartView` (`#384` already tracks that component's own,
 * different-shaped date-range gap separately).
 */
export function DashboardPeriodPicker() {
  const t = useTranslation()
  const period = useDashboardPeriodStore((state) => state.period)
  const setPeriod = useDashboardPeriodStore((state) => state.setPeriod)
  const customStart = useDashboardPeriodStore((state) => state.customStart)
  const setCustomStart = useDashboardPeriodStore(
    (state) => state.setCustomStart,
  )
  const customEnd = useDashboardPeriodStore((state) => state.customEnd)
  const setCustomEnd = useDashboardPeriodStore((state) => state.setCustomEnd)

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      <span className="text-sm font-medium">
        {t.dashboard.trendChartPeriodLabel}
      </span>
      <ToggleGroup
        type="single"
        aria-label={t.dashboard.trendChartPeriodLabel}
        value={period}
        onValueChange={(value) => {
          // Radix single-select toggle groups fire an empty string when
          // clicking the already-active item — this control always keeps
          // exactly one period selected, same as the Week-start toggle
          // elsewhere in Settings, so an empty value is ignored rather
          // than left with nothing selected.
          if (value) setPeriod(value as TrendChartPeriod)
        }}
        className="w-fit flex-wrap"
      >
        <ToggleGroupItem value="all">
          {t.dashboard.trendChartPeriodAllOption}
        </ToggleGroupItem>
        <ToggleGroupItem value="week">
          {t.dashboard.trendChartPeriodWeekOption}
        </ToggleGroupItem>
        <ToggleGroupItem value="month">
          {t.dashboard.trendChartPeriodMonthOption}
        </ToggleGroupItem>
        <ToggleGroupItem value="year">
          {t.dashboard.trendChartPeriodYearOption}
        </ToggleGroupItem>
        <ToggleGroupItem value="custom">
          {t.dashboard.trendChartPeriodCustomOption}
        </ToggleGroupItem>
      </ToggleGroup>
      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label={`${t.dashboard.trendChartPeriodLabel} — ${t.dashboard.rangeStartLabel}`}
            value={customStart}
            max={customEnd || undefined}
            onChange={(e) => setCustomStart(e.target.value)}
            className="h-10"
          />
          <Input
            type="date"
            aria-label={`${t.dashboard.trendChartPeriodLabel} — ${t.dashboard.rangeEndLabel}`}
            value={customEnd}
            min={customStart || undefined}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="h-10"
          />
        </div>
      )}
    </div>
  )
}
