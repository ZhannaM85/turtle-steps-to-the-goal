import { useEffect, useMemo, useState } from 'react'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import {
  calorieEntryKcal,
  mealKcalDeltasVsLastSameLabel,
  type DatedMealKcalDay,
  type MealKcalComparison,
} from '@/domain/dailyEntry'
import type { Dictionary } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  effectiveMealLabel,
  sortCalorieEntriesByLoggedTime,
  type MealSlotDefaultTimes,
} from '@/shared/lib/mealLabel'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

function labelSortedMeals(
  sorted: readonly CalorieEntry[],
  storageEntries: readonly CalorieEntry[],
  t: Dictionary,
): { label: string; kcal: number }[] {
  return sorted.map((entry) => ({
    label: effectiveMealLabel(
      t,
      storageEntries.findIndex((candidate) => candidate.id === entry.id) + 1,
      entry.label,
    ),
    kcal: calorieEntryKcal(entry),
  }))
}

export interface UseMealKcalVsLastSameMealArgs {
  enabled: boolean
  date: string
  calorieEntries: readonly CalorieEntry[]
  mealsInDisplayOrder: readonly CalorieEntry[]
  mealSlotTimes: MealSlotDefaultTimes
  dayStartTime: string
  t: Dictionary
}

/**
 * #836/#977 — kcal delta per displayed meal against the latest earlier day
 * that has the same display label. Loads every saved day once; a missing
 * history just hides the line.
 */
export function useMealKcalVsLastSameMeal({
  enabled,
  date,
  calorieEntries,
  mealsInDisplayOrder,
  mealSlotTimes,
  dayStartTime,
  t,
}: UseMealKcalVsLastSameMealArgs): MealKcalComparison[] {
  const [entries, setEntries] = useState<DailyEntry[]>([])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    dailyEntryRepository
      .getAll()
      .then((result) => {
        if (!cancelled) setEntries(result)
      })
      .catch(() => {
        // Same cosmetic-loss precedent as usePreviousDayEntry.
      })
    return () => {
      cancelled = true
    }
  }, [enabled, date])

  const labeledToday = useMemo(
    () => labelSortedMeals(mealsInDisplayOrder, calorieEntries, t),
    [mealsInDisplayOrder, calorieEntries, t],
  )

  return useMemo(() => {
    if (!enabled) {
      return labeledToday.map(() => ({ delta: null, baselineDate: null }))
    }
    const priorDays: DatedMealKcalDay[] = []
    for (const entry of entries) {
      const meals = entry.calorieEntries
      if (!meals?.length || entry.date >= date) continue
      priorDays.push({
        date: entry.date,
        meals: labelSortedMeals(
          sortCalorieEntriesByLoggedTime(meals, mealSlotTimes, dayStartTime),
          meals,
          t,
        ),
      })
    }
    return mealKcalDeltasVsLastSameLabel(labeledToday, priorDays, date)
  }, [
    enabled,
    labeledToday,
    entries,
    date,
    mealSlotTimes,
    dayStartTime,
    t,
  ])
}
