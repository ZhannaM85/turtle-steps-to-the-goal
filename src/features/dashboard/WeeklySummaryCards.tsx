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
import { StatCard } from '@/shared/ui/stat-card'

function formatSignedNumber(value: number, locale: 'en' | 'ru'): string {
  return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

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
          const value =
            week.deltaVsPriorWeekKg === null
              ? '—'
              : formatSignedNumber(toDisplay(week.deltaVsPriorWeekKg), locale)

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
              unit={week.deltaVsPriorWeekKg === null ? undefined : unit}
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
