import type { SettingsCardKey } from './settingsCardsCollapseStore'

export const SETTINGS_GROUP_IDS = [
  'logging',
  'appearance',
  'library',
  'backup',
  'danger',
] as const

export type SettingsGroupId = (typeof SETTINGS_GROUP_IDS)[number]

/** #877 — unpinned cards sit under their section heading via flex `order`. */
export const SETTINGS_GROUP_HEADING_ORDER: Record<SettingsGroupId, number> = {
  logging: 100,
  appearance: 200,
  library: 300,
  backup: 400,
  danger: 500,
}

export const SETTINGS_CARD_GROUPS: Record<
  SettingsGroupId,
  readonly SettingsCardKey[]
> = {
  logging: [
    'trackingPreset',
    'trackedFields',
    'mealSlotTimes',
    'profile',
    'dailyReminder',
    'nutritionFacts',
    'sinceLastMealTimer',
    'entryComparison',
    'healthConnect',
  ],
  appearance: [
    'units',
    'weekStart',
    'language',
    'appearance',
    'dashboardCharts',
    'trendCharts',
  ],
  library: [
    'mealItems',
    'mealNamePresets',
    'foodList',
    'recipes',
    'customMetrics',
  ],
  backup: ['twoDevicesHelp', 'export', 'localTransfer'],
  danger: ['deleteRange', 'clearAllData'],
}

/** About stays -2000; Features sits just below it and stays pinnable. */
const EXTRA_NATURAL_ORDER: Partial<Record<SettingsCardKey, number>> = {
  features: 50,
}

function buildNaturalOrder(): Record<string, number> {
  const order: Record<string, number> = { ...EXTRA_NATURAL_ORDER }
  for (const group of SETTINGS_GROUP_IDS) {
    const base = SETTINGS_GROUP_HEADING_ORDER[group]
    SETTINGS_CARD_GROUPS[group].forEach((key, index) => {
      order[key] = base + 1 + index
    })
  }
  return order
}

const NATURAL_ORDER = buildNaturalOrder()

export function settingsCardNaturalOrder(id: string): number {
  return NATURAL_ORDER[id] ?? 0
}

export function settingsGroupTitleKey(
  group: SettingsGroupId,
):
  | 'settingsGroupLogging'
  | 'settingsGroupAppearance'
  | 'settingsGroupLibrary'
  | 'settingsGroupBackup'
  | 'settingsGroupDanger' {
  switch (group) {
    case 'logging':
      return 'settingsGroupLogging'
    case 'appearance':
      return 'settingsGroupAppearance'
    case 'library':
      return 'settingsGroupLibrary'
    case 'backup':
      return 'settingsGroupBackup'
    case 'danger':
      return 'settingsGroupDanger'
  }
}
