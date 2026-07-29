import { useCallback, useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  earliestGoalCreatedAt,
  reachedGoalWindows,
  type ReachedGoalWindow,
} from '@/domain/goal'
import {
  IndexedDbDailyEntryRepository,
  IndexedDbGoalRepository,
} from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()
const goalRepository = new IndexedDbGoalRepository()

export type HistoryStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Loads everything History needs: all daily entries (direct repository
 * instance, same simplification as Dashboard's useDashboardData — no
 * shared store, since nothing else needs "all entries" reactively) plus
 * the active goal via the existing goalStore. Also loads *every* goal
 * (own repository instance, same reasoning) to compute reachedGoalWindows()
 * (#155) — List/Calendar need to highlight days from past reached windows
 * too, not just the active goal's. Exposes reload() (called from
 * saveEntry/deleteEntry, not from the initial-load effect itself — the
 * effect fetches inline to satisfy react-hooks/set-state-in-effect, same
 * pattern as useDashboardData) so edits/deletes refresh the list. Also
 * derives `goalTrackingStartDate` (#426) from that same already-fetched
 * `goals` list — the one-time moment goal-tracking itself began, distinct
 * from the active `goal`'s own `createdAt` (which resets to "now" every
 * time a fresh weekly target is started).
 */
export function useHistoryData() {
  const { goal, loadActiveGoal } = useGoalStore()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [reachedWindows, setReachedWindows] = useState<ReachedGoalWindow[]>([])
  const [goalTrackingStartDate, setGoalTrackingStartDate] = useState<
    string | undefined
  >(undefined)
  const [status, setStatus] = useState<HistoryStatus>('loading')

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  useEffect(() => {
    let cancelled = false
    Promise.all([dailyEntryRepository.getAll(), goalRepository.getAll()])
      .then(([all, goals]) => {
        if (cancelled) return
        setEntries(all)
        setReachedWindows(reachedGoalWindows(goals, all))
        setGoalTrackingStartDate(earliestGoalCreatedAt(goals))
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
      const [all, goals] = await Promise.all([
        dailyEntryRepository.getAll(),
        goalRepository.getAll(),
      ])
      setEntries(all)
      setReachedWindows(reachedGoalWindows(goals, all))
      setGoalTrackingStartDate(earliestGoalCreatedAt(goals))
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

  return {
    entries,
    goal,
    reachedWindows,
    goalTrackingStartDate,
    status,
    reload,
    saveEntry,
    deleteEntry,
  }
}
