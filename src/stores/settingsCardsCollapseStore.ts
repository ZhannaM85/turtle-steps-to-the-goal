import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Every Settings card that can collapse (#826), including About. */
export const SETTINGS_CARD_KEYS = [
  'about',
  'features',
  'units',
  'weekStart',
  'dayStart',
  'mealSlotTimes',
  'language',
  'appearance',
  'trackingPreset',
  'trackedFields',
  'profile',
  'dailyReminder',
  'nutritionFacts',
  'sinceLastMealTimer',
  'entryComparison',
  'localTransfer',
  'healthConnect',
  'dashboardCharts',
  'trendCharts',
  'mealItems',
  'mealNamePresets',
  'foodList',
  'recipes',
  'customMetrics',
  'twoDevicesHelp',
  'export',
  'deleteRange',
  'clearAllData',
] as const

export type SettingsCardKey = (typeof SETTINGS_CARD_KEYS)[number]

function allCollapsed(collapsed: boolean): Record<SettingsCardKey, boolean> {
  return Object.fromEntries(
    SETTINGS_CARD_KEYS.map((key) => [key, collapsed]),
  ) as Record<SettingsCardKey, boolean>
}

interface SettingsCardsCollapseState {
  /** `true` = that card's body is hidden. */
  cards: Record<SettingsCardKey, boolean>
  setCollapsed: (key: SettingsCardKey, collapsed: boolean) => void
  collapseAll: () => void
  expandAll: () => void
}

export const useSettingsCardsCollapseStore =
  create<SettingsCardsCollapseState>()(
    persist(
      (set) => ({
        cards: allCollapsed(false),
        setCollapsed: (key, collapsed) =>
          set((state) => ({
            cards: { ...state.cards, [key]: collapsed },
          })),
        collapseAll: () => set({ cards: allCollapsed(true) }),
        expandAll: () => set({ cards: allCollapsed(false) }),
      }),
      {
        name: 'turtle-steps-settings-cards-collapse',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )

export function anySettingsCardExpanded(
  cards: Record<SettingsCardKey, boolean>,
  keys: readonly SettingsCardKey[],
): boolean {
  return keys.some((key) => !cards[key])
}
