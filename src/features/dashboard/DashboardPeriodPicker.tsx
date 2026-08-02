import { useTranslation } from '@/i18n'
import { type TrendChartPeriod } from '@/domain/stats'
import {
  useDashboardPeriodStore,
  type DashboardPeriodChartKey,
} from '@/stores'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

export interface DashboardPeriodPickerProps {
  /** #536 — each chart owns its own period; required. */
  chart: DashboardPeriodChartKey
}

/**
 * #380 — period control for Dashboard trend / correlation sections.
 * **#536** moved it from one page-level picker to a control per chart
 * (Apple Health / brokerage-style), persisted independently in
 * `dashboardPeriodStore`. No dual global+individual mode.
 */
export function DashboardPeriodPicker({ chart }: DashboardPeriodPickerProps) {
  const t = useTranslation()
  const period = useDashboardPeriodStore((state) => state.byChart[chart].period)
  const setPeriod = useDashboardPeriodStore((state) => state.setPeriod)
  const customStart = useDashboardPeriodStore(
    (state) => state.byChart[chart].customStart,
  )
  const setCustomStart = useDashboardPeriodStore((state) => state.setCustomStart)
  const customEnd = useDashboardPeriodStore(
    (state) => state.byChart[chart].customEnd,
  )
  const setCustomEnd = useDashboardPeriodStore((state) => state.setCustomEnd)

  const label = t.dashboard.trendChartPeriodLabel

  return (
    <div className="flex flex-col gap-1.5">
      <ToggleGroup
        type="single"
        aria-label={label}
        value={period}
        onValueChange={(value) => {
          // Radix single-select toggle groups fire an empty string when
          // clicking the already-active item — this control always keeps
          // exactly one period selected, same as the Week-start toggle
          // elsewhere in Settings, so an empty value is ignored rather
          // than left with nothing selected.
          if (value) setPeriod(chart, value as TrendChartPeriod)
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
            aria-label={`${label} — ${t.dashboard.rangeStartLabel}`}
            value={customStart}
            max={customEnd || undefined}
            onChange={(e) => setCustomStart(chart, e.target.value)}
            className="h-10"
          />
          <Input
            type="date"
            aria-label={`${label} — ${t.dashboard.rangeEndLabel}`}
            value={customEnd}
            min={customStart || undefined}
            onChange={(e) => setCustomEnd(chart, e.target.value)}
            className="h-10"
          />
        </div>
      )}
    </div>
  )
}
