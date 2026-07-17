import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * User-defined quick-pick meal names (#110), e.g. "Breakfast"/"Lunch" —
 * offered as one-tap suggestions when naming a meal group, alongside free
 * text. A local UI preference, same category as `weekStartStore` (not part
 * of the export bundle) — starts empty; `dailyEntry.defaultMealNamePresets`
 * (translated) are offered as one-click adds rather than auto-seeded here,
 * so switching app language later doesn't leave stale-language presets
 * behind for anyone who never touched this list.
 */
interface MealLabelPresetStoreState {
  presets: string[]
  addPreset: (name: string) => void
  removePreset: (name: string) => void
}

export const useMealLabelPresetStore = create<MealLabelPresetStoreState>()(
  persist(
    (set) => ({
      presets: [],
      addPreset: (name) =>
        set((state) => {
          const trimmed = name.trim()
          if (!trimmed || state.presets.includes(trimmed)) return state
          return { presets: [...state.presets, trimmed] }
        }),
      removePreset: (name) =>
        set((state) => ({
          presets: state.presets.filter((preset) => preset !== name),
        })),
    }),
    {
      name: 'turtle-steps-meal-label-presets',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
