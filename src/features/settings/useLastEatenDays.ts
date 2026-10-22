import { useCallback, useEffect, useState } from 'react'
import { latestEatenDayByNormalizedName } from '@/domain/mealItem'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/** #1111 — diary day each saved food was last logged, keyed by normalized name. */
export function useLastEatenDays() {
  const [lastEatenByName, setLastEatenByName] = useState<Map<string, string>>(
    () => new Map(),
  )

  const refreshLastEatenDays = useCallback(async () => {
    try {
      const entries = await dailyEntryRepository.getAll()
      setLastEatenByName(latestEatenDayByNormalizedName(entries))
    } catch {
      setLastEatenByName(new Map())
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void dailyEntryRepository
      .getAll()
      .then((entries) => {
        if (!cancelled) {
          setLastEatenByName(latestEatenDayByNormalizedName(entries))
        }
      })
      .catch(() => {
        if (!cancelled) setLastEatenByName(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { lastEatenByName, refreshLastEatenDays }
}
