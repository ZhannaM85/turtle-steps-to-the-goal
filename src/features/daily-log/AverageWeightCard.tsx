import { kgToLb } from '@/domain/goal'
import { rollingAverageWeightKg, type DailyEntry } from '@/domain/dailyEntry'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { useUnitStore } from '@/stores'

const WINDOWS = [
  { days: 7, labelKey: 'averageWeightWeekLabel' },
  { days: 30, labelKey: 'averageWeightMonthLabel' },
  { days: 365, labelKey: 'averageWeightYearLabel' },
] as const

interface AverageWeightCardProps {
  date: string
  entries: DailyEntry[]
}

/** #1126 — three numbers under the morning weight. Hidden while the setting is off. */
export function AverageWeightCard({ date, entries }: AverageWeightCardProps) {
  const t = useTranslation()
  const locale = useLocale()
  const unit = useUnitStore((state) => state.unit)
  const unitLabel = unit === 'lb' ? t.common.lb : t.common.kg
  const points = entries.map((entry) => ({
    date: entry.date,
    weightKg: entry.weightKg,
  }))
  const figures = WINDOWS.map((window) => {
    const averageKg = rollingAverageWeightKg(points, date, window.days)
    if (averageKg === null) return null
    const display = unit === 'lb' ? kgToLb(averageKg) : averageKg
    return {
      days: window.days,
      label: t.dailyEntry[window.labelKey],
      value: formatNumber(display, locale, 1),
    }
  })

  if (figures.every((figure) => figure === null)) return null

  return (
    <div className="grid grid-cols-3 gap-2">
      {figures.map((figure, index) =>
        figure === null ? (
          <div key={WINDOWS[index]!.days} />
        ) : (
          <div key={figure.days} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{figure.label}</span>
            <span className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {figure.value}
              </span>
              <span className="text-sm text-muted-foreground">{unitLabel}</span>
            </span>
          </div>
        ),
      )}
    </div>
  )
}
