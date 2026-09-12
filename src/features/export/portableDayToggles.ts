import { z } from 'zod'
import {
  useAlcoholTrackingStore,
  useCopyYesterdayMealsStore,
  useCycleTrackingStore,
  useDigestionTrackingStore,
  useEatingReasonTrackingStore,
  useEntryComparisonStore,
  useMealKcalVsYesterdayStore,
  useNutritionFactsStore,
  usePlannedMealsTrackingStore,
  useSinceLastMealTimerStore,
  useWaterTrackingStore,
} from '@/stores'

/**
 * #861 — Settings toggles that change what Day shows. Each key is an
 * optional boolean on the JSON backup `settings` blob. Omitted keys leave
 * the device's current value alone (older backups must not flip them).
 * Device-only chrome (theme, pins, local-transfer, Health Connect) stays
 * out of this list.
 */
export const PORTABLE_DAY_TOGGLE_KEYS = [
  'cycleTracking',
  'digestionTracking',
  'waterTracking',
  'alcoholTracking',
  'plannedMealsTracking',
  'eatingReasonTracking',
  'nutritionFacts',
  'sinceLastMealTimer',
  'entryComparison',
  'copyYesterdayMeals',
  'mealKcalVsYesterday',
] as const

export type PortableDayToggleKey = (typeof PORTABLE_DAY_TOGGLE_KEYS)[number]

type DayToggleAccessor = {
  get: () => boolean
  set: (enabled: boolean) => void
}

export const PORTABLE_DAY_TOGGLES: Record<
  PortableDayToggleKey,
  DayToggleAccessor
> = {
  cycleTracking: {
    get: () => useCycleTrackingStore.getState().enabled,
    set: (enabled) => useCycleTrackingStore.setState({ enabled }),
  },
  digestionTracking: {
    get: () => useDigestionTrackingStore.getState().enabled,
    set: (enabled) => useDigestionTrackingStore.setState({ enabled }),
  },
  waterTracking: {
    get: () => useWaterTrackingStore.getState().enabled,
    set: (enabled) => useWaterTrackingStore.setState({ enabled }),
  },
  alcoholTracking: {
    get: () => useAlcoholTrackingStore.getState().enabled,
    set: (enabled) => useAlcoholTrackingStore.setState({ enabled }),
  },
  plannedMealsTracking: {
    get: () => usePlannedMealsTrackingStore.getState().enabled,
    set: (enabled) => usePlannedMealsTrackingStore.setState({ enabled }),
  },
  eatingReasonTracking: {
    get: () => useEatingReasonTrackingStore.getState().enabled,
    set: (enabled) => useEatingReasonTrackingStore.setState({ enabled }),
  },
  nutritionFacts: {
    get: () => useNutritionFactsStore.getState().enabled,
    set: (enabled) => useNutritionFactsStore.setState({ enabled }),
  },
  sinceLastMealTimer: {
    get: () => useSinceLastMealTimerStore.getState().enabled,
    set: (enabled) => useSinceLastMealTimerStore.setState({ enabled }),
  },
  entryComparison: {
    get: () => useEntryComparisonStore.getState().enabled,
    set: (enabled) => useEntryComparisonStore.setState({ enabled }),
  },
  copyYesterdayMeals: {
    get: () => useCopyYesterdayMealsStore.getState().enabled,
    set: (enabled) => useCopyYesterdayMealsStore.setState({ enabled }),
  },
  mealKcalVsYesterday: {
    get: () => useMealKcalVsYesterdayStore.getState().enabled,
    set: (enabled) => useMealKcalVsYesterdayStore.setState({ enabled }),
  },
}

export const portableDayToggleSchema = z.object({
  cycleTracking: z.boolean().optional(),
  digestionTracking: z.boolean().optional(),
  waterTracking: z.boolean().optional(),
  alcoholTracking: z.boolean().optional(),
  plannedMealsTracking: z.boolean().optional(),
  eatingReasonTracking: z.boolean().optional(),
  nutritionFacts: z.boolean().optional(),
  sinceLastMealTimer: z.boolean().optional(),
  entryComparison: z.boolean().optional(),
  copyYesterdayMeals: z.boolean().optional(),
  mealKcalVsYesterday: z.boolean().optional(),
})

export function collectPortableDayToggles(): Record<
  PortableDayToggleKey,
  boolean
> {
  const result = {} as Record<PortableDayToggleKey, boolean>
  for (const key of PORTABLE_DAY_TOGGLE_KEYS) {
    result[key] = PORTABLE_DAY_TOGGLES[key].get()
  }
  return result
}

export function applyPortableDayToggles(
  settings: Partial<Record<PortableDayToggleKey, boolean | undefined>>,
): void {
  for (const key of PORTABLE_DAY_TOGGLE_KEYS) {
    const value = settings[key]
    if (value !== undefined) {
      PORTABLE_DAY_TOGGLES[key].set(value)
    }
  }
}
