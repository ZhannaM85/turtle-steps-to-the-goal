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
 *
 * Also owns deletion (#174): `deleteGoal` removes a single history record
 * and re-fetches on its own (a plain save doesn't change `refreshKey` for
 * a delete, since the active goal is untouched), so `GoalScreen` doesn't
 * need its own repository instance just to wire up the delete button.
 */
export function usePastGoals(refreshKey: unknown): {
  records: PastGoalRecord[]
  deleteGoal: (id: string) => Promise<void>
} {
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

  async function deleteGoal(id: string) {
    await goalRepository.deleteGoal(id)
    // Re-fetch directly (#174) rather than relying on refreshKey — a
    // delete doesn't touch the active goal, so nothing else would
    // otherwise trigger the effect above.
    const [goals, entries] = await Promise.all([
      goalRepository.getAll(),
      dailyEntryRepository.getAll(),
    ])
    setRecords(pastGoals(goals, entries))
  }

  return { records, deleteGoal }
}
