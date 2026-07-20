import { useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { goalWindowProgress, type GoalWindowProgress } from '@/domain/goal'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

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

  if (!goal || entries.length === 0) return null
  return goalWindowProgress(entries, goal)
}
