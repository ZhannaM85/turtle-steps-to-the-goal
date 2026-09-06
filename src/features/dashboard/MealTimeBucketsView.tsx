import type { ReactNode } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  effectiveDateFor,
  entriesInRecentWindow,
  mealTimeBucketTallies,
  type MealTimeBucket,
} from '@/domain/stats'
import { useTranslation } from '@/i18n'
import { useDashboardChartVisibilityStore, useDayStartStore } from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { EmptyDashboardSection } from './EmptyDashboardSection'
import { RankingList } from './RankingList'

export interface MealTimeBucketsViewProps {
  entries: DailyEntry[]
  dragHandle?: ReactNode
}

const WINDOWS = [7, 30] as const

function bucketLabel(
  bucket: MealTimeBucket,
  t: ReturnType<typeof useTranslation>,
): string {
  switch (bucket) {
    case 'morning':
      return t.dashboard.mealTimeBucketMorning
    case 'afternoon':
      return t.dashboard.mealTimeBucketAfternoon
    case 'evening':
      return t.dashboard.mealTimeBucketEvening
    case 'night':
      return t.dashboard.mealTimeBucketNight
  }
}

/**
 * When meals happened in the last 7 / 30 days (#815). Clock buckets only
 * — not a timing-vs-weight correlation.
 */
export function MealTimeBucketsView({
  entries,
  dragHandle,
}: MealTimeBucketsViewProps) {
  const t = useTranslation()
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const today = effectiveDateFor(new Date(), dayStartTime)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.mealTimeBuckets,
  )

  const windows = WINDOWS.map((windowDays) => ({
    windowDays,
    ...mealTimeBucketTallies(
      entriesInRecentWindow(entries, windowDays, today),
    ),
  }))
  const hasRows = windows.some((w) =>
    w.buckets.some((bucket) => bucket.count > 0),
  )

  if (!hasRows) {
    return (
      <EmptyDashboardSection
        chart="mealTimeBuckets"
        title={t.dashboard.mealTimeBucketsTitle}
        description={t.dashboard.dashboardSectionEmptyDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  const cardTitle = (
    <ChartTitleWithToggle
      chart="mealTimeBuckets"
      title={t.dashboard.mealTimeBucketsTitle}
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
        {t.dashboard.mealTimeBucketsDescription}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {windows.map((w) => (
          <div key={w.windowDays} className="flex flex-col gap-1.5">
            <RankingList
              title={
                w.windowDays === 7
                  ? t.dashboard.last7DaysLabel
                  : t.dashboard.last30DaysLabel
              }
              rows={w.buckets.map((row) => ({
                key: row.bucket,
                label: bucketLabel(row.bucket, t),
                value: String(row.count),
              }))}
            />
            {w.missingTimeCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {t.dashboard.mealTimeBucketsMissingTime(w.missingTimeCount)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
