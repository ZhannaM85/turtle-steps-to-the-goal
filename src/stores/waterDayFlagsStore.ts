import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #548 — per-day user flags that bump the arithmetic water recommendation
 * (hot day / after workout). Local preference only, not in the export bundle.
 */
interface DayFlags {
  hotDay: boolean
  afterWorkout: boolean
}

interface WaterDayFlagsStoreState {
  byDate: Record<string, DayFlags>
  setHotDay: (date: string, hotDay: boolean) => void
  setAfterWorkout: (date: string, afterWorkout: boolean) => void
  flagsFor: (date: string) => DayFlags
}

const EMPTY: DayFlags = { hotDay: false, afterWorkout: false }

export const useWaterDayFlagsStore = create<WaterDayFlagsStoreState>()(
  persist(
    (set, get) => ({
      byDate: {},
      flagsFor: (date) => get().byDate[date] ?? EMPTY,
      setHotDay: (date, hotDay) =>
        set((state) => ({
          byDate: {
            ...state.byDate,
            [date]: { ...(state.byDate[date] ?? EMPTY), hotDay },
          },
        })),
      setAfterWorkout: (date, afterWorkout) =>
        set((state) => ({
          byDate: {
            ...state.byDate,
            [date]: { ...(state.byDate[date] ?? EMPTY), afterWorkout },
          },
        })),
    }),
    {
      name: 'turtle-steps-water-day-flags',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
