import { useEffect, useState } from 'react'
import { currentWeekInfo, type CurrentWeekInfo } from '@/domain/stats'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Shared by TodayScreen and GoalScreen (issue #18): "which week" info for
 * the "This week's target" StatCard. Fetches only the earliest logged
 * date (a cheap indexed query, not all entries) and derives the week
 * number/range from it.
 */
export function useCurrentWeekInfo(): CurrentWeekInfo | null {
  const [info, setInfo] = useState<CurrentWeekInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getEarliestDate()
      .then((earliest) => {
        if (cancelled) return
        setInfo(currentWeekInfo(new Date(), earliest))
      })
      .catch(() => {
        // No week label is a minor cosmetic loss, not worth surfacing as
        // an error state on the StatCard — the description is optional.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return info
}
