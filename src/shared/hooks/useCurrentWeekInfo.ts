import { useEffect, useState } from 'react'
import { currentWeekInfo, type CurrentWeekInfo } from '@/domain/stats'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { resolveWeekStartsOn } from '@/shared/lib/resolveWeekStartsOn'
import { useWeekStartStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Shared by TodayScreen and GoalScreen (issue #18): "which week" info for
 * the "This week's target" StatCard. Fetches only the earliest logged
 * date (a cheap indexed query, not all entries) and derives the week
 * number/range from it. Week-start day (#85) comes from `weekStartStore`.
 */
export function useCurrentWeekInfo(): CurrentWeekInfo | null {
  const [info, setInfo] = useState<CurrentWeekInfo | null>(null)
  const weekStart = useWeekStartStore((state) => state.weekStart)

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getEarliestDate()
      .then((earliest) => {
        if (cancelled) return
        setInfo(
          currentWeekInfo(
            new Date(),
            earliest,
            resolveWeekStartsOn(weekStart, earliest),
          ),
        )
      })
      .catch(() => {
        // No week label is a minor cosmetic loss, not worth surfacing as
        // an error state on the StatCard — the description is optional.
      })
    return () => {
      cancelled = true
    }
  }, [weekStart])

  return info
}
