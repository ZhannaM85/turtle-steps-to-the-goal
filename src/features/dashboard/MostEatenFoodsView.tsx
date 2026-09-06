import type { ReactNode } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  effectiveDateFor,
  entriesInRecentWindow,
  mostEatenFoods,
} from '@/domain/stats'
import { useTranslation } from '@/i18n'
import { useDashboardChartVisibilityStore, useDayStartStore } from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { EmptyDashboardSection } from './EmptyDashboardSection'
import { RankingList } from './RankingList'

export interface MostEatenFoodsViewProps {
  entries: DailyEntry[]
  dragHandle?: ReactNode
}

const WINDOWS = [7, 30] as const

/**
 * Which named dishes showed up most often in the last 7 / 30 days (#812).
 * Not a correlation — a frequency ranking, same rolling windows as
 * Recent averages. Grouped by trimmed dish name.
 */
export function MostEatenFoodsView({
  entries,
  dragHandle,
}: MostEatenFoodsViewProps) {
  const t = useTranslation()
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const today = effectiveDateFor(new Date(), dayStartTime)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.mostEatenRecently,
  )

  const windows = WINDOWS.map((windowDays) => ({
    windowDays,
    foods: mostEatenFoods(entriesInRecentWindow(entries, windowDays, today)),
  }))
  const hasRows = windows.some((w) => w.foods.length > 0)

  if (!hasRows) {
    return (
      <EmptyDashboardSection
        chart="mostEatenRecently"
        title={t.dashboard.mostEatenTitle}
        description={t.dashboard.dashboardSectionEmptyDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  const cardTitle = (
    <ChartTitleWithToggle
      chart="mostEatenRecently"
      title={t.dashboard.mostEatenTitle}
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
        {t.dashboard.mostEatenDescription}
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
            rows={w.foods.map((food) => ({
              key: food.name,
              label: food.name,
              value: String(food.count),
            }))}
          />
        ))}
      </div>
    </div>
  )
}
