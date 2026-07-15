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
import { useUnitStore } from '@/stores'
import { StatCard } from '@/shared/ui/stat-card'

export interface WeeklySummaryCardsProps {
  entries: DailyEntry[]
  goal: Goal | null
}

export function WeeklySummaryCards({ entries, goal }: WeeklySummaryCardsProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)

  const summaries = weeklySummaries(entries, goal ?? undefined)
  if (summaries.length === 0) return null

  const weeksMostRecentFirst = [...summaries].reverse()

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.dashboard.weeklySummaryTitle}
      </h2>
      <div className="flex flex-col gap-2">
        {weeksMostRecentFirst.map((week) => {
          const rangeLabel = t.dashboard.weekRange(
            format(parseISO(week.weekStart), 'MMM d', {
              locale: dateFnsLocale,
            }),
            format(parseISO(week.weekEnd), 'MMM d', { locale: dateFnsLocale }),
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
