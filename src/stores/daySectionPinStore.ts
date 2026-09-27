import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** #1022 — Day blocks that can pin under the date header, Settings-style. */
export const DAY_SECTION_PIN_IDS = [
  'sleep',
  'morning',
  'stats',
  'nutritionFacts',
  'macros',
  'dayTotals',
  'meals',
  'plannedMeals',
  'water',
  'customMetrics',
  'evening',
  'nightFood',
  'nextMorningWeight',
] as const

export type DaySectionPinId = (typeof DAY_SECTION_PIN_IDS)[number]

const DAY_SECTION_PIN_ID_SET = new Set<string>(DAY_SECTION_PIN_IDS)

export function isDaySectionPinId(id: string): id is DaySectionPinId {
  return DAY_SECTION_PIN_ID_SET.has(id)
}

interface DaySectionPinState {
  /** Pin order: index 0 is the top of the sticky dock. */
  pinned: DaySectionPinId[]
  toggle: (id: DaySectionPinId) => void
}

export const DAY_SECTION_PIN_STORAGE_KEY = 'turtle-steps-day-section-pins'

/** #1022 — same persist shape as `turtle-steps-settings-pins`. */
export const useDaySectionPinStore = create<DaySectionPinState>()(
  persist(
    (set) => ({
      pinned: [],
      toggle: (id) =>
        set((state) => ({
          pinned: state.pinned.includes(id)
            ? state.pinned.filter((item) => item !== id)
            : [...state.pinned, id],
        })),
    }),
    {
      name: DAY_SECTION_PIN_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | Partial<DaySectionPinState>
          | undefined
        const pinned = Array.isArray(persisted?.pinned)
          ? persisted.pinned.filter(isDaySectionPinId)
          : []
        return { ...currentState, pinned }
      },
    },
  ),
)
