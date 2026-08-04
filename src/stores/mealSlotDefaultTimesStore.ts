import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
  type MealSlotDefaultTimes,
  type MealSlotKey,
} from '@/shared/lib/mealLabel'

interface MealSlotDefaultTimesStoreState {
  /** #588 — remembered Breakfast/Lunch/Dinner/Snack HH:MM defaults for
   * MyFitnessPal imports (and display fallbacks via `effectiveTimeEaten`).
   * Built-in clocks match #580 until the user changes them on import or in
   * Settings. */
  times: MealSlotDefaultTimes
  setTimes: (times: MealSlotDefaultTimes) => void
  setSlotTime: (slot: MealSlotKey, time: string) => void
}

export const useMealSlotDefaultTimesStore =
  create<MealSlotDefaultTimesStoreState>()(
    persist(
      (set) => ({
        times: { ...BUILTIN_MEAL_SLOT_DEFAULT_TIMES },
        setTimes: (times) => set({ times: { ...times } }),
        setSlotTime: (slot, time) =>
          set((state) => ({
            times: { ...state.times, [slot]: time },
          })),
      }),
      {
        name: 'turtle-steps-meal-slot-default-times',
        storage: createJSONStorage(() => localStorage),
        merge: (persisted, current) => {
          const partial = persisted as Partial<MealSlotDefaultTimesStoreState>
          return {
            ...current,
            ...partial,
            times: {
              ...BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
              ...(partial.times ?? {}),
            },
          }
        },
      },
    ),
  )
