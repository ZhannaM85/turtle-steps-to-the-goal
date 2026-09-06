import type { ReactNode } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  eatingReasonTallies,
  effectiveDateFor,
  entriesInRecentWindow,
} from '@/domain/stats'
import { useTranslation } from '@/i18n'
import { eatingReasonDisplayLabel } from '@/shared/lib/eatingReasonDisplay'
import {
  useDashboardChartVisibilityStore,
  useDayStartStore,
  useEatingReasonTrackingStore,
} from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { EmptyDashboardSection } from './EmptyDashboardSection'
import { RankingList } from './RankingList'

export interface EatingReasonsTallyViewProps {
  entries: DailyEntry[]
  dragHandle?: ReactNode
}

const WINDOWS = [7, 30] as const

/**
 * Why meals happened in the last 7 / 30 days (#814). Hidden when
 * eating-reason tracking is off. Not a correlation.
 */
export function EatingReasonsTallyView({
  entries,
  dragHandle,
}: EatingReasonsTallyViewProps) {
  const trackingEnabled = useEatingReasonTrackingStore((state) => state.enabled)
  const overrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )
  const t = useTranslation()
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const today = effectiveDateFor(new Date(), dayStartTime)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.eatingReasonsTally,
  )

  if (!trackingEnabled) return null

  const windows = WINDOWS.map((windowDays) => ({
    windowDays,
    rows: eatingReasonTallies(
      entriesInRecentWindow(entries, windowDays, today),
    ),
  }))
  const hasRows = windows.some((w) => w.rows.length > 0)

  if (!hasRows) {
    return (
      <EmptyDashboardSection
        chart="eatingReasonsTally"
        title={t.dashboard.eatingReasonsTallyTitle}
        description={t.dashboard.dashboardSectionEmptyDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  const cardTitle = (
    <ChartTitleWithToggle
      chart="eatingReasonsTally"
      title={t.dashboard.eatingReasonsTallyTitle}
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
        {t.dashboard.eatingReasonsTallyDescription}
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
              key: row.reason,
              label: eatingReasonDisplayLabel(row.reason, t, overrides),
              value: String(row.count),
            }))}
          />
        ))}
      </div>
    </div>
  )
}
