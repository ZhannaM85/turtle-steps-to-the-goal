import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import { dateRangeSummary, type DateRangeSummary } from '@/domain/stats'
import {
  formatNumber,
  formatSignedNumber,
  unitLabel,
  useLocale,
  useTranslation,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { macrosSummaryText } from '@/shared/lib/macroDisplay'
import { Input } from '@/shared/ui/input'
import { StatCard } from '@/shared/ui/stat-card'
import { useUnitStore } from '@/stores'

export interface CompareRangesViewProps {
  entries: DailyEntry[]
}

function isoMonthRange(monthsAgo: number): { start: string; end: string } {
  const base = subMonths(new Date(), monthsAgo)
  return {
    start: format(startOfMonth(base), 'yyyy-MM-dd'),
    end: format(endOfMonth(base), 'yyyy-MM-dd'),
  }
}

function rangeCardDescription(
  summary: DateRangeSummary,
  locale: Locale,
  t: Dictionary,
): string {
  const parts: string[] = [t.dashboard.compareRangesDayCount(summary.loggedDayCount)]
  if (summary.averageCalories !== null) {
    parts.push(
      `${t.dashboard.averageCaloriesLabel}: ${formatNumber(summary.averageCalories, locale, 0)}`,
    )
  }
  const macrosSummary = macrosSummaryText(
    summary.averageProteinG ?? undefined,
    summary.averageFatG ?? undefined,
    summary.averageCarbsG ?? undefined,
    locale,
    t,
  )
  if (macrosSummary) parts.push(macrosSummary)
  return parts.join(' · ')
}

/**
 * Lets a user compare two arbitrary, independently-picked date ranges
 * side by side (#222) — distinct from WeeklySummaryCards/MonthlySummaryCards,
 * which list chronological calendar periods rather than two ranges the user
 * chooses to set against each other. Defaults to this month vs. last month,
 * matching the issue's own example, so there's something to look at before
 * the user touches either picker.
 */
export function CompareRangesView({ entries }: CompareRangesViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)

  const defaultA = isoMonthRange(0)
  const defaultB = isoMonthRange(1)
  const [startA, setStartA] = useState(defaultA.start)
  const [endA, setEndA] = useState(defaultA.end)
  const [startB, setStartB] = useState(defaultB.start)
  const [endB, setEndB] = useState(defaultB.end)

  if (entries.length === 0) return null

  const summaryA = dateRangeSummary(entries, startA, endA)
  const summaryB = dateRangeSummary(entries, startB, endB)
  const weightDeltaKg =
    summaryA.averageWeightKg !== null && summaryB.averageWeightKg !== null
      ? summaryB.averageWeightKg - summaryA.averageWeightKg
      : null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.dashboard.compareRangesTitle}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t.dashboard.rangeALabel}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label={`${t.dashboard.rangeALabel} — ${t.dashboard.rangeStartLabel}`}
              value={startA}
              max={endA}
              onChange={(e) => setStartA(e.target.value)}
              className="h-10"
            />
            <Input
              type="date"
              aria-label={`${t.dashboard.rangeALabel} — ${t.dashboard.rangeEndLabel}`}
              value={endA}
              min={startA}
              onChange={(e) => setEndA(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t.dashboard.rangeBLabel}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label={`${t.dashboard.rangeBLabel} — ${t.dashboard.rangeStartLabel}`}
              value={startB}
              max={endB}
              onChange={(e) => setStartB(e.target.value)}
              className="h-10"
            />
            <Input
              type="date"
              aria-label={`${t.dashboard.rangeBLabel} — ${t.dashboard.rangeEndLabel}`}
              value={endB}
              min={startB}
              onChange={(e) => setEndB(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label={t.dashboard.rangeALabel}
          value={
            summaryA.averageWeightKg === null
              ? '—'
              : formatNumber(toDisplay(summaryA.averageWeightKg), locale)
          }
          unit={summaryA.averageWeightKg === null ? undefined : unit}
          description={rangeCardDescription(summaryA, locale, t)}
        />
        <StatCard
          label={t.dashboard.rangeBLabel}
          value={
            summaryB.averageWeightKg === null
              ? '—'
              : formatNumber(toDisplay(summaryB.averageWeightKg), locale)
          }
          unit={summaryB.averageWeightKg === null ? undefined : unit}
          description={rangeCardDescription(summaryB, locale, t)}
        />
      </div>
      {weightDeltaKg !== null && (
        <p className="text-sm text-foreground">
          {t.dashboard.compareRangesWeightDelta(
            formatSignedNumber(toDisplay(weightDeltaKg), locale),
            unit,
          )}
        </p>
      )}
    </div>
  )
}
