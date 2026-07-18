import { useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { goalWindowProgress } from '@/domain/goal'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  useDailyEntryStore,
  useGoalCelebrationStore,
  useGoalStore,
} from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Whether to show the weekly-goal-met celebration modal (#55) — fires as
 * soon as the current goal-anchored window's (#135, `goalWindowProgress`)
 * running progress crosses true, mid-window, not just once the window is
 * over. Independent of #38's separate end-of-window banner; both can fire
 * for the same window.
 *
 * targetMet is a running number, not stable until the window ends, so once
 * a window has been celebrated it stays celebrated even if the average
 * later dips back below target — avoids flip-flopping the modal back on
 * for the same window.
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

  const progress = goalWindowProgress(entries, goal)
  const shouldCelebrate =
    progress !== null &&
    progress.targetMet === true &&
    progress.weekStart !== celebratedWeekStart

  return {
    shouldCelebrate,
    dismiss: () => {
      if (progress) markCelebrated(progress.weekStart)
    },
  }
}
