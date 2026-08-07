import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  effectiveDateFor,
  recentAverages,
  recentAverageWindowRange,
} from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'
import { formatMacroGrams } from '@/shared/lib/macroDisplay'
import { StatCard } from '@/shared/ui/stat-card'
import { useDashboardChartVisibilityStore, useDayStartStore } from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'

export interface RecentAveragesCardsProps {
  entries: DailyEntry[]
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

const WINDOWS = [7, 30] as const

/**
 * Rolling "as of today" averages (#215) — distinct from WeeklySummaryCards/
 * MonthlySummaryCards, which group by calendar week/month. These two cards
 * answer "how am I doing lately" at a glance without scrolling through a
 * list of past periods. #506 — each card keeps its relative title and
 * appends the inclusive from→to calendar range (same `weekRange` + `'PP'`
 * formatting WeeklySummaryCards uses), so "Last 7 days" is not ambiguous.
 */
export function RecentAveragesCards({
  entries,
  dragHandle,
}: RecentAveragesCardsProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.recentAverages,
  )
  // #625 — "today" for this rolling window should respect day-start too,
  // same meaning `TodayScreen.tsx`'s own "today" already uses.
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const today = effectiveDateFor(new Date(), dayStartTime)

  const windows = WINDOWS.map((windowDays) => ({
    windowDays,
    ...recentAverages(entries, windowDays, today),
    ...recentAverageWindowRange(windowDays, today),
  })).filter(
    (w) => w.averageCalories !== null || w.averageProteinG !== null,
  )

  if (windows.length === 0) return null

  const cardTitle = (
    <ChartTitleWithToggle
      chart="recentAverages"
      title={t.dashboard.recentAveragesTitle}
      dragHandle={dragHandle}
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-3 rounded-lg border border-border p-3">{cardTitle}</div>
  }

  const windowLabel = (days: number) =>
    days === 7 ? t.dashboard.last7DaysLabel : t.dashboard.last30DaysLabel

  const formatRangeDate = (isoDate: string) =>
    format(parseISO(isoDate), 'PP', { locale: dateFnsLocale })

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      {cardTitle}
      <div className="flex flex-col gap-2">
        {windows.map(
          ({
            windowDays,
            averageCalories,
            averageProteinG,
            startDate,
            endDate,
          }) => {
            const rangeLabel = t.dashboard.weekRange(
              formatRangeDate(startDate),
              formatRangeDate(endDate),
            )
            const descriptionParts: string[] = [rangeLabel]
            if (averageProteinG !== null) {
              descriptionParts.push(
                `${t.dailyEntry.proteinLabel}: ${formatMacroGrams(averageProteinG, locale, t)}`,
              )
            }
            return (
              <StatCard
                key={windowDays}
                label={windowLabel(windowDays)}
                value={
                  averageCalories === null
                    ? '—'
                    : formatNumber(averageCalories, locale, 0)
                }
                unit={averageCalories === null ? undefined : t.dailyEntry.kcalUnit}
                description={descriptionParts.join(' · ')}
              />
            )
          },
        )}
      </div>
    </div>
  )
}
