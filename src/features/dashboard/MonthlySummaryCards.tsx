import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  averageNutritionTargetsForEntries,
  kgToLb,
  type Goal,
} from '@/domain/goal'
import { monthlySummaries } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { macrosSummaryText } from '@/shared/lib/macroDisplay'
import { useDashboardChartVisibilityStore, useUnitStore } from '@/stores'
import { StatCard } from '@/shared/ui/stat-card'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { EmptyDashboardSection } from './EmptyDashboardSection'

export interface MonthlySummaryCardsProps {
  entries: DailyEntry[]
  /** #897 — past + active goals for per-month nutrition target averages. */
  goals?: Goal[]
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

/**
 * Same shape as `WeeklySummaryCards.tsx` (#226) — deliberately no
 * *weight* `targetMet` note: goals in this app are always a *weekly*
 * weight target (`Goal.targetWeeklyLossKg`). `#897` does add calorie/macro
 * actual-vs-daily-target averages (not a monthly weight target).
 */
export function MonthlySummaryCards({
  entries,
  goals = [],
  dragHandle,
}: MonthlySummaryCardsProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.monthlySummary,
  )

  const summaries = monthlySummaries(entries)
  if (summaries.length === 0) {
    return (
      <EmptyDashboardSection
        chart="monthlySummary"
        title={t.dashboard.monthlySummaryTitle}
        description={t.dashboard.dashboardSectionEmptyDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  const cardTitle = (
    <ChartTitleWithToggle
      chart="monthlySummary"
      title={t.dashboard.monthlySummaryTitle}
      dragHandle={dragHandle}
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-3 section-shell p-3">{cardTitle}</div>
  }

  const monthsMostRecentFirst = [...summaries].reverse()

  return (
    <div className="flex flex-col gap-3 section-shell p-3">
      {cardTitle}
      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
        {monthsMostRecentFirst.map((month) => {
          const monthLabel = format(parseISO(month.monthStart), 'MMMM yyyy', {
            locale: dateFnsLocale,
          })
          const delta = month.deltaVsPriorMonthKg
          const deltaText =
            delta === null ? null : formatNumber(toDisplay(delta), locale)
          const isLoss = delta !== null && delta < 0
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

          const monthEntries = entries.filter(
            (entry) =>
              entry.date >= month.monthStart && entry.date <= month.monthEnd,
          )
          const targets = averageNutritionTargetsForEntries(monthEntries, goals)

          const descriptionParts: string[] = []
          if (delta !== null && month.averageWeightKg !== null) {
            descriptionParts.push(
              t.goal.previousToCurrentWeightLabel(
                formatNumber(
                  toDisplay(month.averageWeightKg - delta),
                  locale,
                ),
                formatNumber(toDisplay(month.averageWeightKg), locale),
                unit,
              ),
            )
          }
          if (month.averageCalories !== null) {
            descriptionParts.push(
              targets.averageCalorieTargetKcal !== null
                ? `${t.dashboard.averageCaloriesLabel}: ${t.dailyEntry.actualVsTargetText(
                    formatNumber(month.averageCalories, locale, 0),
                    formatNumber(targets.averageCalorieTargetKcal, locale, 0),
                  )}`
                : `${t.dashboard.averageCaloriesLabel}: ${formatNumber(month.averageCalories, locale, 0)}`,
            )
          }
          const macrosSummary = macrosSummaryText(
            month.averageProteinG ?? undefined,
            month.averageFatG ?? undefined,
            month.averageCarbsG ?? undefined,
            locale,
            t,
          )
          if (macrosSummary) {
            descriptionParts.push(macrosSummary)
            if (
              targets.averageProteinTargetG !== null ||
              targets.averageFatTargetG !== null ||
              targets.averageCarbTargetG !== null
            ) {
              const proteinPart =
                month.averageProteinG !== null &&
                targets.averageProteinTargetG !== null
                  ? `${t.dailyEntry.proteinLabel} ${t.dailyEntry.actualVsTargetText(
                      formatNumber(month.averageProteinG, locale, 0),
                      formatNumber(targets.averageProteinTargetG, locale, 0),
                    )}${t.dailyEntry.gramsUnit}`
                  : null
              const fatPart =
                month.averageFatG !== null &&
                targets.averageFatTargetG !== null
                  ? `${t.dailyEntry.fatLabel} ${t.dailyEntry.actualVsTargetText(
                      formatNumber(month.averageFatG, locale, 0),
                      formatNumber(targets.averageFatTargetG, locale, 0),
                    )}${t.dailyEntry.gramsUnit}`
                  : null
              const carbPart =
                month.averageCarbsG !== null &&
                targets.averageCarbTargetG !== null
                  ? `${t.dailyEntry.carbsLabel} ${t.dailyEntry.actualVsTargetText(
                      formatNumber(month.averageCarbsG, locale, 0),
                      formatNumber(targets.averageCarbTargetG, locale, 0),
                    )}${t.dailyEntry.gramsUnit}`
                  : null
              const vsTarget = [proteinPart, fatPart, carbPart]
                .filter(Boolean)
                .join(' · ')
              if (vsTarget) descriptionParts.push(vsTarget)
            }
          }

          return (
            <StatCard
              key={month.monthStart}
              label={monthLabel}
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
