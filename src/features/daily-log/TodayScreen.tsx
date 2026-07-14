import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { kgToLb } from '@/domain/goal'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useCurrentWeekInfo, usePreviousDayEntry } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard } from '@/shared/ui/stat-card'
import { useDailyEntryStore, useGoalStore, useUnitStore } from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function TodayScreen() {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const { goal, status: goalStatus, loadActiveGoal } = useGoalStore()
  const {
    entry,
    status: entryStatus,
    loadEntry,
    saveEntry,
  } = useDailyEntryStore()
  const [date, setDate] = useState(todayIso)
  const weekInfo = useCurrentWeekInfo()
  const previousDayEntry = usePreviousDayEntry(date)

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  useEffect(() => {
    loadEntry(date)
  }, [date, loadEntry])

  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const weeklyPace = goal ? toDisplay(goal.targetWeeklyLossKg) : null

  // Day-over-day delta (#42) — a distinct, unsmoothed number from the
  // weekly average-vs-average delta on Dashboard; only shown once both
  // this day and the one before it have a logged weight.
  const weightDeltaKg =
    entry?.weightKg !== undefined && previousDayEntry?.weightKg !== undefined
      ? entry.weightKg - previousDayEntry.weightKg
      : null
  const weightDeltaText =
    weightDeltaKg === null
      ? null
      : formatNumber(toDisplay(weightDeltaKg), locale)
  const isWeightLoss = weightDeltaKg !== null && weightDeltaKg < 0
  // Same asymmetric emphasis as the weekly summary cards (#29): a loss is
  // worth noticing, a gain or no-change stays quiet rather than a stark
  // number — day-to-day weight is noisy (water, timing), more so than the
  // week-level delta this echoes.
  const weightDeltaValue =
    weightDeltaText === null ? null : isWeightLoss ? (
      weightDeltaText
    ) : (
      <span className="text-2xl font-normal text-muted-foreground">
        {weightDeltaText}
      </span>
    )

  // Quiet, one-day nudge (#38) — only on the last day of the current ISO
  // week, and only when a goal already exists (a goal-less user already
  // sees the "Set a goal" empty state above, which covers that case).
  // No dismiss state to persist: it naturally stops once the week rolls
  // over, matching the app's no-pressure tone (no badges/streaks).
  const showGoalRenewalReminder = Boolean(
    goal && weekInfo && weekInfo.weekEnd === todayIso(),
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.today.title} description={t.today.description} />

      {goalStatus === 'loading' || goalStatus === 'idle' ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : goal ? (
        <StatCard
          label={t.today.thisWeeksTarget}
          value={formatNumber(weeklyPace!, locale)}
          unit={t.today.toLose(unitLabel(displayUnit, t))}
          description={
            weekInfo
              ? t.common.weekLabel(
                  weekInfo.weekNumber,
                  format(parseISO(weekInfo.weekStart), 'MMM d', {
                    locale: dateFnsLocale,
                  }),
                  format(parseISO(weekInfo.weekEnd), 'MMM d', {
                    locale: dateFnsLocale,
                  }),
                )
              : undefined
          }
        />
      ) : (
        <EmptyState
          title={t.today.emptyGoalTitle}
          description={t.today.emptyGoalDescription}
          action={
            <Button asChild>
              <Link to="/goal">{t.today.setGoalButton}</Link>
            </Button>
          }
        />
      )}

      {weightDeltaValue !== null && (
        <StatCard
          label={t.today.vsYesterdayLabel}
          value={weightDeltaValue}
          unit={unitLabel(displayUnit, t)}
        />
      )}

      {showGoalRenewalReminder && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <span>{t.today.goalRenewalReminder}</span>
          <Link
            to="/goal"
            className="shrink-0 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t.today.reviewGoalLink}
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="log-date">{t.today.dateLabel}</Label>
        <Input
          id="log-date"
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          className="max-w-48"
        />
      </div>

      {entryStatus === 'loading' || entryStatus === 'idle' ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : (
        <DailyEntryForm
          key={date}
          date={date}
          existingEntry={entry}
          onSave={saveEntry}
        />
      )}
    </div>
  )
}
