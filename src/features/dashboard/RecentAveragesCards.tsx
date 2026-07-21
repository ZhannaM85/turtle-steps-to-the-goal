import type { DailyEntry } from '@/domain/dailyEntry'
import { recentAverages } from '@/domain/stats'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { formatMacroGrams } from '@/shared/lib/macroDisplay'
import { StatCard } from '@/shared/ui/stat-card'

export interface RecentAveragesCardsProps {
  entries: DailyEntry[]
}

const WINDOWS = [7, 30] as const

/**
 * Rolling "as of today" averages (#215) — distinct from WeeklySummaryCards/
 * MonthlySummaryCards, which group by calendar week/month. These two cards
 * answer "how am I doing lately" at a glance without scrolling through a
 * list of past periods.
 */
export function RecentAveragesCards({ entries }: RecentAveragesCardsProps) {
  const t = useTranslation()
  const locale = useLocale()

  const windows = WINDOWS.map((windowDays) => ({
    windowDays,
    ...recentAverages(entries, windowDays),
  })).filter(
    (w) => w.averageCalories !== null || w.averageProteinG !== null,
  )

  if (windows.length === 0) return null

  const windowLabel = (days: number) =>
    days === 7 ? t.dashboard.last7DaysLabel : t.dashboard.last30DaysLabel

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.dashboard.recentAveragesTitle}
      </h2>
      <div className="flex flex-col gap-2">
        {windows.map(({ windowDays, averageCalories, averageProteinG }) => (
          <StatCard
            key={windowDays}
            label={windowLabel(windowDays)}
            value={
              averageCalories === null
                ? '—'
                : formatNumber(averageCalories, locale, 0)
            }
            unit={averageCalories === null ? undefined : t.dailyEntry.kcalUnit}
            description={
              averageProteinG === null
                ? undefined
                : `${t.dailyEntry.proteinLabel}: ${formatMacroGrams(averageProteinG, locale, t)}`
            }
          />
        ))}
      </div>
    </div>
  )
}
