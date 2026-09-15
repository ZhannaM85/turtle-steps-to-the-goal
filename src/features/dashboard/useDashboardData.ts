import { useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { earliestGoalCreatedAt, type Goal } from '@/domain/goal'
import {
  IndexedDbDailyEntryRepository,
  IndexedDbGoalRepository,
} from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()
const goalRepository = new IndexedDbGoalRepository()

export type DashboardStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Loads everything the Dashboard needs: all daily entries (there's no
 * shared store for "all entries" since nothing else needs it reactively —
 * same simplification as ExportScreen, a direct repository instance) plus
 * the active goal via the existing goalStore. Also loads *every* goal (own
 * repository instance, same reasoning `useHistoryData` already established)
 * to derive `goalTrackingStartDate` (#426) — the earliest goal ever
 * created, distinct from the active `goal`'s own `createdAt` (which resets
 * to "now" every time a fresh weekly target is started). `#897` also
 * returns that full goals list for per-period nutrition target averages.
 */
export function useDashboardData() {
  const { goal, status: goalStatus, loadActiveGoal } = useGoalStore()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalTrackingStartDate, setGoalTrackingStartDate] = useState<
    string | undefined
  >(undefined)
  const [entriesStatus, setEntriesStatus] = useState<DashboardStatus>('loading')

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  useEffect(() => {
    let cancelled = false
    Promise.all([dailyEntryRepository.getAll(), goalRepository.getAll()])
      .then(([all, allGoals]) => {
        if (cancelled) return
        setEntries(all)
        setGoals(allGoals)
        setGoalTrackingStartDate(earliestGoalCreatedAt(allGoals))
        setEntriesStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setEntriesStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const status: DashboardStatus =
    goalStatus === 'error' || entriesStatus === 'error'
      ? 'error'
      : goalStatus === 'ready' && entriesStatus === 'ready'
        ? 'ready'
        : goalStatus === 'idle' || entriesStatus === 'idle'
          ? 'idle'
          : 'loading'

  return { goal, goals, entries, goalTrackingStartDate, status }
}
