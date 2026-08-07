import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  goalWindowAverages,
  goalWindowHasEnded,
  goalWindowProgress,
} from '@/domain/goal'
import { correlationInsight, effectiveDateFor } from '@/domain/stats'
import { formatNumber, getDateFnsLocale, useLocale, useTranslation } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useWeekStartsOn } from '@/shared/hooks'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { useDayStartStore, useGoalStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * A calm, single-screen end-of-week glance (#602), reached from Goal:
 * this week's `goalWindowProgress`, average kcal/protein for the window
 * (`goalWindowAverages`), and one plain-language line from the existing
 * flagship weekly correlation (`correlationInsight`) — every number comes
 * from already-shipped domain stats, no new scoring system. Template
 * strings only; a missed target reads as calm/factual, not a failure.
 */
export function WeeklyReviewScreen() {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const { goal, loadActiveGoal } = useGoalStore()
  const [entries, setEntries] = useState<DailyEntry[]>([])

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository.getAll().then((all) => {
      if (!cancelled) setEntries(all)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const weekStartsOn = useWeekStartsOn(entries)
  // #601 — "is this week still in progress"/"how far into the goal window
  // are we" should respect day-start too, same meaning `TodayScreen.tsx`'s
  // own "today" already uses.
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const today = effectiveDateFor(new Date(), dayStartTime)
  const insight = correlationInsight(
    entries,
    weekStartsOn,
    format(today, 'yyyy-MM-dd'),
  )

  const progress = goal ? goalWindowProgress(entries, goal) : null
  const averages = goal ? goalWindowAverages(entries, goal, today) : null

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/goal"
        className="self-start text-sm text-muted-foreground hover:text-foreground"
      >
        {t.weeklyReview.backToGoalLabel}
      </Link>
      <PageHeader
        title={t.weeklyReview.screenTitle}
        description={t.weeklyReview.screenDescription}
      />

      {!goal || !progress ? (
        <p className="text-sm text-muted-foreground">
          {t.weeklyReview.noActiveGoalMessage}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
            <h2 className="text-sm font-medium text-foreground">
              {t.weeklyReview.progressSectionLabel}
            </h2>
            <p className="text-sm text-muted-foreground">
              {/* #639: once the window has actually ended, the "met" verdict
               * here should reflect its real final state (finalTargetMet),
               * not the sticky targetMet — otherwise a target only ever
               * crossed on one noisy mid-week day, then regressed, would
               * still read "reached" on this glance after the window
               * closed, same bug the permanent history badge had. */}
              {(goalWindowHasEnded(progress.weekEnd)
                ? progress.finalTargetMet
                : progress.targetMet) && progress.metOnDate
                ? t.weeklyReview.progressMetLabel(
                    format(parseISO(progress.metOnDate), 'PP', {
                      locale: dateFnsLocale,
                    }),
                  )
                : progress.baselineWeightKg === undefined
                  ? t.weeklyReview.progressNoBaselineYetMessage
                  : t.weeklyReview.progressNotYetLabel}
            </p>
          </section>

          <section className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
            <h2 className="text-sm font-medium text-foreground">
              {t.weeklyReview.averagesSectionLabel}
            </h2>
            <p className="text-sm text-muted-foreground">
              {averages?.averageCalories !== null &&
              averages?.averageCalories !== undefined
                ? t.weeklyReview.averagesSummary(
                    formatNumber(averages.averageCalories, locale, 0),
                    averages.averageProteinG === null
                      ? '—'
                      : `${formatNumber(averages.averageProteinG, locale, 0)}g`,
                  )
                : t.weeklyReview.noAveragesYetMessage}
            </p>
          </section>

          <section className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
            <h2 className="text-sm font-medium text-foreground">
              {t.weeklyReview.insightSectionLabel}
            </h2>
            <p className="text-sm text-muted-foreground">
              {insight
                ? t.dashboard.correlationSummary(
                    insight.thresholdKcal,
                    insight.lowerAveragedMoreLoss ? 'lower' : 'higher',
                  )
                : t.dashboard.correlationEmptyDescription}
            </p>
          </section>

          <Button variant="outline" size="sm" className="self-start" asChild>
            <Link to="/goal">{t.weeklyReview.adjustPaceButton}</Link>
          </Button>
        </>
      )}
    </div>
  )
}
