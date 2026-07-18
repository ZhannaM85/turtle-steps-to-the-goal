import { useEffect, useState } from 'react'
import { pastGoals, type PastGoalRecord } from '@/domain/goal'
import {
  IndexedDbDailyEntryRepository,
  IndexedDbGoalRepository,
} from '@/infrastructure/persistence/indexeddb'

const goalRepository = new IndexedDbGoalRepository()
const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Every past (non-active) goal with its own reached/missed progress (#147),
 * for GoalScreen's history section. `refreshKey` should change whenever a
 * goal might have just been saved, so a freshly-created historical record
 * shows up without needing a reload — same convention as
 * `useMaxRecordedWeight`.
 */
export function usePastGoals(refreshKey: unknown): PastGoalRecord[] {
  const [records, setRecords] = useState<PastGoalRecord[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([goalRepository.getAll(), dailyEntryRepository.getAll()])
      .then(([goals, entries]) => {
        if (cancelled) return
        setRecords(pastGoals(goals, entries))
      })
      .catch(() => {
        // No goal history is a minor cosmetic loss, not worth surfacing as
        // an error state — same precedent as useMaxRecordedWeight.
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return records
}
