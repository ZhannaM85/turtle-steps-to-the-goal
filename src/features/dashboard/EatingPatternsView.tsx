import { useState, type ReactNode } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  eatingEpisodeLinks,
  eatingPatternInsights,
  effectiveDateFor,
  entriesInRecentWindow,
  type EatingPatternInsight,
} from '@/domain/stats'
import { useTranslation } from '@/i18n'
import { formatSleepDuration } from '@/shared/lib/sleepDuration'
import { eatingReasonDisplayLabel } from '@/shared/lib/eatingReasonDisplay'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import {
  useDashboardChartVisibilityStore,
  useDayStartStore,
  useEatingReasonTrackingStore,
  useMealSlotDefaultTimesStore,
} from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { EmptyDashboardSection } from './EmptyDashboardSection'

export interface EatingPatternsViewProps {
  entries: DailyEntry[]
  dragHandle?: ReactNode
}

function durationLabel(
  minutes: number,
  hoursUnit: string,
  minutesUnit: string,
): string {
  return formatSleepDuration(minutes / 60, hoursUnit, minutesUnit)
}

function insightText(
  insight: EatingPatternInsight,
  t: ReturnType<typeof useTranslation>,
  hoursUnit: string,
  minutesUnit: string,
  reasonLabel: (reason: string) => string,
): string {
  if (insight.kind === 'carbGap') {
    const higher = durationLabel(insight.higherCarbMinutes, hoursUnit, minutesUnit)
    const lower = durationLabel(insight.lowerCarbMinutes, hoursUnit, minutesUnit)
    const base = t.dashboard.eatingPatternsCarbGap(higher, lower)
    if (insight.nextReasonedCount >= 4 && insight.nextCravingCount > 0) {
      return `${base} ${t.dashboard.eatingPatternsCarbGapCraving(
        insight.nextCravingCount,
        insight.nextReasonedCount,
      )}`
    }
    return base
  }
  const avg = durationLabel(insight.averageMinutes, hoursUnit, minutesUnit)
  const base = t.dashboard.eatingPatternsEveningNight(
    insight.eveningThenNightCount,
    insight.eveningCount,
    avg,
  )
  if (insight.topNextReason && insight.topNextReasonCount > 0) {
    return `${base} ${t.dashboard.eatingPatternsEveningNightReason(
      reasonLabel(insight.topNextReason),
      insight.topNextReasonCount,
    )}`
  }
  return base
}

/**
 * Personal eating patterns (#823) — what tends to happen after a meal
 * (time to the next eating episode), not another count table.
 */
export function EatingPatternsView({
  entries,
  dragHandle,
}: EatingPatternsViewProps) {
  const t = useTranslation()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const slotTimes = useMealSlotDefaultTimesStore((state) => state.times)
  const reasonsEnabled = useEatingReasonTrackingStore((state) => state.enabled)
  const today = effectiveDateFor(new Date(), dayStartTime)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.eatingPatterns,
  )
  const overrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )

  const recent = entriesInRecentWindow(entries, 30, today)
  const recentInsights = eatingPatternInsights(
    eatingEpisodeLinks(recent, dayStartTime, slotTimes),
    { includeReasons: reasonsEnabled },
  )
  const insights =
    recentInsights.length > 0
      ? recentInsights
      : eatingPatternInsights(
          eatingEpisodeLinks(entries, dayStartTime, slotTimes),
          { includeReasons: reasonsEnabled },
        )

  const title = (
    <ChartTitleWithToggle
      chart="eatingPatterns"
      title={t.dashboard.eatingPatternsTitle}
      dragHandle={dragHandle}
    />
  )

  if (insights.length === 0) {
    return (
      <EmptyDashboardSection
        chart="eatingPatterns"
        title={t.dashboard.eatingPatternsTitle}
        description={t.dashboard.eatingPatternsLearningDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  if (!cardVisible) {
    return <div className="flex flex-col gap-3 section-shell p-3">{title}</div>
  }

  return (
    <div className="flex flex-col gap-3 section-shell p-3">
      {title}
      <p className="text-sm text-muted-foreground">
        {t.dashboard.eatingPatternsDescription}
      </p>
      <ul className="flex flex-col gap-3">
        {insights.map((insight) => (
          <li key={insight.kind} className="flex flex-col gap-1">
            <p className="text-sm text-foreground">
              {insightText(
                insight,
                t,
                t.dailyEntry.hoursUnit,
                t.dailyEntry.minutesUnit,
                (reason) =>
                  eatingReasonDisplayLabel(reason, t, overrides),
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.dashboard.eatingPatternsSampleSize(insight.sampleSize)}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {t.dashboard.eatingPatternsCaveat}
      </p>
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="text-left text-sm text-muted-foreground underline"
          >
            {t.dashboard.eatingPatternsDetailsLabel}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="pt-2 text-sm text-muted-foreground">
            {t.dashboard.eatingPatternsDetailsBody}
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
