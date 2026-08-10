import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { goalWindowProgress, type GoalWindowProgress } from '@/domain/goal'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalCelebrationStore, useGoalStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()
const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * `goalWindowProgress()` for the currently active goal (#155) — factored
 * out of `useWeeklyGoalCelebration` (which now consumes this instead of
 * loading entries itself) so `GoalScreen`'s own "reached" badge/nudge
 * banner can share the same live-refreshing data. Re-fetches entries
 * whenever anything saves on Today (#31 — weight, note, or a meal each
 * save independently), so a target crossed by *this* visit's own save is
 * reflected without needing a reload. Null while the goal or entries
 * haven't loaded yet, or there's no active goal at all.
 */
export function useActiveGoalProgress(): GoalWindowProgress | null {
  const { goal, loadActiveGoal } = useGoalStore()
  const savedEntry = useDailyEntryStore((state) => state.entry)
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const reachedOnLastDayWeekStart = useGoalCelebrationStore(
    (state) => state.reachedOnLastDayWeekStart,
  )
  const markReachedOnLastDay = useGoalCelebrationStore(
    (state) => state.markReachedOnLastDay,
  )

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
  }, [savedEntry])

  const progress =
    goal && entries.length > 0 ? goalWindowProgress(entries, goal) : null

  // #667 — reaching the target on the window's own last day locks the
  // final state in immediately, so a later same-day re-weigh that
  // overwrites today's entry with a heavier value can't quietly un-reach
  // it (see goalCelebrationStore.ts).
  useEffect(() => {
    if (!progress) return
    const today = format(new Date(), DATE_FORMAT)
    if (
      today === progress.weekEnd &&
      progress.finalTargetMet === true &&
      reachedOnLastDayWeekStart !== progress.weekStart
    ) {
      markReachedOnLastDay(progress.weekStart)
    }
  }, [progress, reachedOnLastDayWeekStart, markReachedOnLastDay])

  if (!progress) return null
  if (reachedOnLastDayWeekStart === progress.weekStart) {
    return { ...progress, finalTargetMet: true }
  }
  return progress
}
