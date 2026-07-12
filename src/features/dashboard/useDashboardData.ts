import { useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export type DashboardStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Loads everything the Dashboard needs: all daily entries (there's no
 * shared store for "all entries" since nothing else needs it reactively —
 * same simplification as ExportScreen, a direct repository instance) plus
 * the active goal via the existing goalStore.
 */
export function useDashboardData() {
  const { goal, status: goalStatus, loadActiveGoal } = useGoalStore()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [entriesStatus, setEntriesStatus] = useState<DashboardStatus>('loading')

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getAll()
      .then((all) => {
        if (cancelled) return
        setEntries(all)
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

  return { goal, entries, status }
}
