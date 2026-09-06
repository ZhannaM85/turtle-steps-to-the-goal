import type { ReactNode } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  effectiveDateFor,
  entriesInRecentWindow,
  mealNameTallies,
} from '@/domain/stats'
import { useTranslation } from '@/i18n'
import { useDashboardChartVisibilityStore, useDayStartStore } from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { EmptyDashboardSection } from './EmptyDashboardSection'
import { RankingList } from './RankingList'

export interface MealNameFrequencyViewProps {
  entries: DailyEntry[]
  dragHandle?: ReactNode
}

const WINDOWS = [7, 30] as const

/**
 * How often each meal name (Breakfast / Lunch / custom) showed up in the
 * last 7 / 30 days (#816). Not a dish ranking and not a correlation.
 */
export function MealNameFrequencyView({
  entries,
  dragHandle,
}: MealNameFrequencyViewProps) {
  const t = useTranslation()
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const today = effectiveDateFor(new Date(), dayStartTime)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.mealNameFrequency,
  )

  const windows = WINDOWS.map((windowDays) => ({
    windowDays,
    rows: mealNameTallies(
      entriesInRecentWindow(entries, windowDays, today),
      t,
    ),
  }))
  const hasRows = windows.some((w) => w.rows.length > 0)

  if (!hasRows) {
    return (
      <EmptyDashboardSection
        chart="mealNameFrequency"
        title={t.dashboard.mealNameFrequencyTitle}
        description={t.dashboard.dashboardSectionEmptyDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  const cardTitle = (
    <ChartTitleWithToggle
      chart="mealNameFrequency"
      title={t.dashboard.mealNameFrequencyTitle}
      dragHandle={dragHandle}
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-3 section-shell p-3">{cardTitle}</div>
  }

  return (
    <div className="flex flex-col gap-3 section-shell p-3">
      {cardTitle}
      <p className="text-sm text-muted-foreground">
        {t.dashboard.mealNameFrequencyDescription}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {windows.map((w) => (
          <RankingList
            key={w.windowDays}
            title={
              w.windowDays === 7
                ? t.dashboard.last7DaysLabel
                : t.dashboard.last30DaysLabel
            }
            rows={w.rows.map((row) => ({
              key: row.name,
              label: row.name,
              value: String(row.count),
            }))}
          />
        ))}
      </div>
    </div>
  )
}
