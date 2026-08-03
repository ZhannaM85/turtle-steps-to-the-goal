import { useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  goalCoveringDate,
  goalWindowProgress,
  type Goal,
  type GoalWindowProgress,
} from '@/domain/goal'
import {
  IndexedDbDailyEntryRepository,
  IndexedDbGoalRepository,
} from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalStore } from '@/stores'

const goalRepository = new IndexedDbGoalRepository()
const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * #552 — Goal (and its window progress) whose week covers `date`, if any.
 * Day's weekly target card uses this so browsing 2019 doesn't show a 2026
 * goal. Re-fetches when the active goal or a saved entry changes.
 */
export function useGoalCoveringDate(date: string): {
  goal: Goal | null
  progress: GoalWindowProgress | null
} {
  const activeGoal = useGoalStore((state) => state.goal)
  const savedEntry = useDailyEntryStore((state) => state.entry)
  const [goals, setGoals] = useState<Goal[]>([])
  const [entries, setEntries] = useState<DailyEntry[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([goalRepository.getAll(), dailyEntryRepository.getAll()])
      .then(([allGoals, allEntries]) => {
        if (cancelled) return
        setGoals(allGoals)
        setEntries(allEntries)
      })
      .catch(() => {
        // Cosmetic card only — same soft-fail precedent as usePastGoals.
      })
    return () => {
      cancelled = true
    }
  }, [date, activeGoal, savedEntry])

  const goal = goalCoveringDate(goals, date) ?? null
  const progress = goal ? goalWindowProgress(entries, goal) : null
  return { goal, progress }
}
