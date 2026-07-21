import { format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
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

export interface MonthlySummaryCardsProps {
  entries: DailyEntry[]
}

/**
 * Same shape as `WeeklySummaryCards.tsx` (#226) — deliberately no
 * `targetMet` note, unlike that one: goals in this app are always a
 * *weekly* target (`Goal.targetWeeklyLossKg`), and there's no existing
 * monthly-target concept to compare against; summing several weeks' worth
 * of targets into a rough monthly figure would be inventing a comparison
 * rather than reusing one.
 */
export function MonthlySummaryCards({ entries }: MonthlySummaryCardsProps) {
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
  if (summaries.length === 0) return null

  const cardTitle = (
    <ChartTitleWithToggle
      chart="monthlySummary"
      title={t.dashboard.monthlySummaryTitle}
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-3">{cardTitle}</div>
  }

  const monthsMostRecentFirst = [...summaries].reverse()

  return (
    <div className="flex flex-col gap-3">
      {cardTitle}
      <div className="flex flex-col gap-2">
        {monthsMostRecentFirst.map((month) => {
          const monthLabel = format(parseISO(month.monthStart), 'MMMM yyyy', {
            locale: dateFnsLocale,
          })
          const delta = month.deltaVsPriorMonthKg
          // formatNumber (not formatSignedNumber): a loss should still show
          // its minus sign, but a gain shouldn't get an explicit "+" — same
          // convention WeeklySummaryCards.tsx already uses.
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

          const descriptionParts: string[] = []
          if (month.averageCalories !== null) {
            descriptionParts.push(
              `${t.dashboard.averageCaloriesLabel}: ${formatNumber(month.averageCalories, locale, 0)}`,
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
