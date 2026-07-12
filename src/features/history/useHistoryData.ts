import { useCallback, useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export type HistoryStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Loads everything History needs: all daily entries (direct repository
 * instance, same simplification as Dashboard's useDashboardData — no
 * shared store, since nothing else needs "all entries" reactively) plus
 * the active goal via the existing goalStore. Exposes reload() (called
 * from saveEntry/deleteEntry, not from the initial-load effect itself —
 * the effect fetches inline to satisfy react-hooks/set-state-in-effect,
 * same pattern as useDashboardData) so edits/deletes refresh the list.
 */
export function useHistoryData() {
  const { goal, loadActiveGoal } = useGoalStore()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [status, setStatus] = useState<HistoryStatus>('loading')

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
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const reload = useCallback(async () => {
    try {
      const all = await dailyEntryRepository.getAll()
      setEntries(all)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  async function saveEntry(entry: DailyEntry) {
    await dailyEntryRepository.upsert(entry)
    await reload()
  }

  async function deleteEntry(id: string) {
    await dailyEntryRepository.delete(id)
    await reload()
  }

  return { entries, goal, status, reload, saveEntry, deleteEntry }
}
