import { format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb, type Goal } from '@/domain/goal'
import { weeklySummaries } from '@/domain/stats'
import {
  formatNumber,
  formatSignedNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { StatCard } from '@/shared/ui/stat-card'

export interface WeeklySummaryCardsProps {
  entries: DailyEntry[]
  goal: Goal | null
}

export function WeeklySummaryCards({ entries, goal }: WeeklySummaryCardsProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = goal?.displayUnit ?? 'kg'
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
          const deltaText =
            delta === null ? null : formatSignedNumber(toDisplay(delta), locale)
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
