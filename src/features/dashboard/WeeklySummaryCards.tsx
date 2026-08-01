import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb, type Goal } from '@/domain/goal'
import { weeklySummaries } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { macrosSummaryText } from '@/shared/lib/macroDisplay'
import { useDashboardChartVisibilityStore, useUnitStore } from '@/stores'
import { useWeekStartsOn } from '@/shared/hooks'
import { StatCard } from '@/shared/ui/stat-card'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'

export interface WeeklySummaryCardsProps {
  entries: DailyEntry[]
  goal: Goal | null
  /** #426 — the earliest goal ever created (`earliestGoalCreatedAt`), not
   * the active `goal`'s own `createdAt`. See `weeklySummaries()`'s own doc
   * comment for why those two are deliberately different values. */
  goalTrackingStartDate?: string
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

export function WeeklySummaryCards({
  entries,
  goal,
  goalTrackingStartDate,
  dragHandle,
}: WeeklySummaryCardsProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const weekStartsOn = useWeekStartsOn(entries)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.weeklySummary,
  )

  const summaries = weeklySummaries(
    entries,
    goal ?? undefined,
    weekStartsOn,
    goalTrackingStartDate,
  )
  if (summaries.length === 0) return null

  const cardTitle = (
    <ChartTitleWithToggle
      chart="weeklySummary"
      title={t.dashboard.weeklySummaryTitle}
      dragHandle={dragHandle}
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-3 rounded-lg border border-border p-3">{cardTitle}</div>
  }

  const weeksMostRecentFirst = [...summaries].reverse()

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      {cardTitle}
      {/* #379 — a multi-year import can add 300+ weekly cards; a
       * max-height scrollable container (rather than pagination) keeps
       * the list from pushing the rest of the Dashboard far down the
       * page, without adding new interactive state of its own. */}
      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
        {weeksMostRecentFirst.map((week) => {
          const rangeLabel = t.dashboard.weekRange(
            format(parseISO(week.weekStart), 'PP', {
              locale: dateFnsLocale,
            }),
            format(parseISO(week.weekEnd), 'PP', {
              locale: dateFnsLocale,
            }),
          )
          const delta = week.deltaVsPriorWeekKg
          // formatNumber (not formatSignedNumber): a loss should still show
          // its minus sign, but a gain shouldn't get an explicit "+" - just
          // the plain value. Intl.NumberFormat's default sign display
          // already does exactly that (minus for negative, nothing for
          // positive/zero), no extra conditional needed.
          const deltaText =
            delta === null ? null : formatNumber(toDisplay(delta), locale)
          const isLoss = delta !== null && delta < 0
          // A loss gets the card's full bold treatment — something worth
          // noticing. A gain (or no change) stays factual but visually
          // quieter, rather than a giant stark "+" reading like a graded
          // failure (nothing is hidden, just de-emphasized).
          const value =
            deltaText === null ? (
              '—'
            ) : isLoss ? (
              deltaText
            ) : (
              <span className="text-2xl font-normal text-muted-foreground">
                {deltaText}
              </span>
            )

          const descriptionParts: string[] = []
          // #483 — the two period averages the delta is computed from
          // (prior → this), same "X → Y kg" shape MetTargetList/#408 uses.
          if (
            delta !== null &&
            week.averageWeightKg !== null
          ) {
            descriptionParts.push(
              t.goal.previousToCurrentWeightLabel(
                formatNumber(
                  toDisplay(week.averageWeightKg - delta),
                  locale,
                ),
                formatNumber(toDisplay(week.averageWeightKg), locale),
                unit,
              ),
            )
          }
          if (week.averageCalories !== null) {
            descriptionParts.push(
              `${t.dashboard.averageCaloriesLabel}: ${formatNumber(week.averageCalories, locale, 0)}`,
            )
          }
          const macrosSummary = macrosSummaryText(
            week.averageProteinG ?? undefined,
            week.averageFatG ?? undefined,
            week.averageCarbsG ?? undefined,
            locale,
            t,
          )
          if (macrosSummary) {
            descriptionParts.push(macrosSummary)
          }
          if (week.targetMet) {
            descriptionParts.push(t.dashboard.targetMetNote)
          }

          return (
            <StatCard
              key={week.weekStart}
              label={rangeLabel}
              value={value}
              unit={delta === null ? undefined : unit}
              description={
                descriptionParts.length > 0
                  ? descriptionParts.join(' · ')
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
