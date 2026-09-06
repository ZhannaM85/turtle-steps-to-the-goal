import { useState, type ReactNode } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  effectiveDateFor,
  entriesInRecentWindow,
  foodFrequencyTallies,
  mostEatenFoods,
  type FoodFrequencyRankBy,
} from '@/domain/stats'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
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
 * Which named dishes showed up most often in the last 7 / 30 days (#812),
 * with a Count | kcal toggle (#813). Not a correlation.
 */
export function MostEatenFoodsView({
  entries,
  dragHandle,
}: MostEatenFoodsViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [rankBy, setRankBy] = useState<FoodFrequencyRankBy>('count')
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const today = effectiveDateFor(new Date(), dayStartTime)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.mostEatenRecently,
  )

  const windows = WINDOWS.map((windowDays) => {
    const inWindow = entriesInRecentWindow(entries, windowDays, today)
    const namedKcalTotal = foodFrequencyTallies(inWindow).reduce(
      (sum, row) => sum + row.kcal,
      0,
    )
    return {
      windowDays,
      namedKcalTotal,
      foods: mostEatenFoods(inWindow, rankBy),
    }
  })
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
      <ToggleGroup
        type="single"
        aria-label={t.dashboard.mostEatenModeGroupLabel}
        value={rankBy}
        onValueChange={(value) => {
          if (value === 'count' || value === 'kcal') setRankBy(value)
        }}
        className="w-fit flex-wrap"
      >
        <ToggleGroupItem value="count">
          {t.dashboard.mostEatenCountModeLabel}
        </ToggleGroupItem>
        <ToggleGroupItem value="kcal">
          {t.dashboard.mostEatenKcalModeLabel}
        </ToggleGroupItem>
      </ToggleGroup>
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
              value:
                rankBy === 'kcal'
                  ? t.dashboard.mostEatenKcalValue(
                      formatNumber(food.kcal, locale, 0),
                      w.namedKcalTotal > 0
                        ? Math.round((food.kcal / w.namedKcalTotal) * 100)
                        : 0,
                    )
                  : String(food.count),
            }))}
          />
        ))}
      </div>
    </div>
  )
}
