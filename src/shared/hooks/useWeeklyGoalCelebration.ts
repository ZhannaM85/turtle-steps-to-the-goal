import { useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { weeklySummaries } from '@/domain/stats'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useWeekStartsOn } from '@/shared/hooks/useWeekStartsOn'
import {
  useDailyEntryStore,
  useGoalCelebrationStore,
  useGoalStore,
} from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Whether to show the weekly-goal-met celebration modal (#55) — fires as
 * soon as the current (most recent) week's running targetMet computation
 * crosses true, mid-week, not just once the week is over. Independent of
 * #38's separate end-of-week banner; both can fire in the same week.
 *
 * targetMet is a running number (weeklySummaries.ts), not stable until the
 * week ends, so once a week has been celebrated it stays celebrated for the
 * rest of that week even if the average later dips back below target —
 * avoids flip-flopping the modal back on for the same week.
 */
export function useWeeklyGoalCelebration(): {
  shouldCelebrate: boolean
  dismiss: () => void
} {
  const { goal, loadActiveGoal } = useGoalStore()
  // Re-fetch trigger: bumps whenever any field saves on Today (#31 — weight,
  // note, or a meal each save independently), so a target crossed by
  // *this* visit's own save is reflected without needing a reload.
  const savedEntry = useDailyEntryStore((state) => state.entry)
  const celebratedWeekStart = useGoalCelebrationStore(
    (state) => state.celebratedWeekStart,
  )
  const markCelebrated = useGoalCelebrationStore(
    (state) => state.markCelebrated,
  )
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const weekStartsOn = useWeekStartsOn(entries)

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

  if (!goal || entries.length === 0) {
    return { shouldCelebrate: false, dismiss: () => {} }
  }

  const summaries = weeklySummaries(entries, goal, weekStartsOn)
  const currentWeek = summaries[summaries.length - 1]
  const shouldCelebrate =
    currentWeek !== undefined &&
    currentWeek.targetMet === true &&
    currentWeek.weekStart !== celebratedWeekStart

  return {
    shouldCelebrate,
    dismiss: () => {
      if (currentWeek) markCelebrated(currentWeek.weekStart)
    },
  }
}
