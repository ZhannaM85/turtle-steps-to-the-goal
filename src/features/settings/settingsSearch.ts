import type { Dictionary } from '@/i18n'
import { getDictionary, type Locale } from '@/i18n'
import { DEFAULT_DASHBOARD_SECTION_ORDER } from '@/stores/dashboardSectionOrderStore'
import type { DashboardChartKey } from '@/stores/dashboardChartVisibilityStore'
import {
  SETTINGS_CARD_GROUPS,
  settingsGroupTitleKey,
  type SettingsGroupId,
} from '@/stores/settingsCardGroups'
import type { SettingsCardKey } from '@/stores/settingsCardsCollapseStore'
import { dashboardChartTitle } from './dashboardChartTitle'

const LOCALES: readonly Locale[] = ['en', 'ru']

/** #1018 — case-insensitive substring match. A blank query matches everything. */
export function normalizeSettingsSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase()
}

export function settingsSearchQueryActive(query: string): boolean {
  return normalizeSettingsSearchQuery(query).length > 0
}

export function settingsSearchMatches(
  query: string,
  texts: readonly string[],
): boolean {
  const needle = normalizeSettingsSearchQuery(query)
  if (needle.length === 0) return true
  return texts.some((text) => text.toLocaleLowerCase().includes(needle))
}

function bothLists(pick: (dict: Dictionary) => readonly string[]): string[] {
  return LOCALES.flatMap((locale) => pick(getDictionary(locale)))
}

function cardGroup(card: SettingsCardKey): SettingsGroupId | null {
  for (const group of Object.keys(SETTINGS_CARD_GROUPS) as SettingsGroupId[]) {
    if (SETTINGS_CARD_GROUPS[group].includes(card)) return group
  }
  return null
}

function groupTitleTexts(group: SettingsGroupId): string[] {
  const key = settingsGroupTitleKey(group)
  return bothLists((dict) => [dict.settings[key]])
}

function sectionLabels(card: SettingsCardKey, dict: Dictionary): string[] {
  const s = dict.settings
  switch (card) {
    case 'about':
      return [s.aboutLabel, s.aboutDescription, s.viewAboutButton]
    case 'features':
      return [s.featuresLabel, s.featuresDescription, s.viewFeaturesButton]
    case 'units':
      return [s.unitsLabel, dict.common.kg, dict.common.lb]
    case 'weekStart':
      return [
        s.weekStartLabel,
        s.weekStartDescription,
        s.weekStartMonday,
        s.weekStartFirstEntry,
      ]
    case 'mealSlotTimes':
      return [
        s.mealSlotDefaultTimesLabel,
        s.mealSlotDefaultTimesDescription,
        ...dict.dailyEntry.defaultMealNamePresets,
      ]
    case 'language':
      return [s.languageLabel, s.english, s.russian]
    case 'appearance':
      return [s.appearanceLabel]
    case 'trackingPreset':
      return [
        s.trackingPresetLabel,
        s.trackingPresetDescription,
        s.trackingPresetSimpleButton,
        s.trackingPresetFullButton,
      ]
    case 'trackedFields':
      return [s.trackedFieldsLabel, s.trackedFieldsDescription]
    case 'profile':
      return [
        s.profileLabel,
        s.profileDescription,
        s.heightLabel,
        s.ageLabel,
        s.sexLabel,
        s.sexFemaleOption,
        s.sexMaleOption,
        s.activityLevelLabel,
        s.activityLevelSedentary,
        s.activityLevelLight,
        s.activityLevelModerate,
        s.activityLevelActive,
        s.activityLevelVeryActive,
      ]
    case 'dailyReminder':
      return [
        s.dailyReminderLabel,
        s.dailyReminderDescription,
        s.dailyReminderTimeLabel,
      ]
    case 'nutritionFacts':
      return [s.nutritionFactsLabel, s.nutritionFactsDescription]
    case 'sinceLastMealTimer':
      return [s.sinceLastMealTimerLabel, s.sinceLastMealTimerDescription]
    case 'entryComparison':
      return [s.entryComparisonLabel, s.entryComparisonDescription]
    case 'localTransfer':
      return [s.localTransferLabel, s.localTransferDescription]
    case 'healthConnect':
      return [
        s.healthConnectSyncLabel,
        s.healthConnectSyncDescription,
        s.healthConnectSyncButton,
      ]
    case 'dashboardCharts':
      return [s.dashboardChartsLabel, s.dashboardChartsDescription]
    case 'trendCharts':
      return [s.trendChartsLabel, s.trendChartsDescription]
    case 'mealItems':
      return [s.mealItemsLabel, s.mealItemsDescription]
    case 'mealNamePresets':
      return [s.mealNamePresetsLabel, s.mealNamePresetsDescription]
    case 'foodList':
      return [s.foodListLabel, s.foodListDescription, s.manageFoodListButton]
    case 'recipes':
      return [
        dict.recipes.settingsSectionLabel,
        dict.recipes.settingsSectionDescription,
        dict.recipes.manageRecipesButton,
      ]
    case 'customMetrics':
      return [
        dict.customMetrics.settingsSectionLabel,
        dict.customMetrics.settingsSectionDescription,
        dict.customMetrics.manageCustomMetricsButton,
      ]
    case 'twoDevicesHelp':
      return [
        s.twoDevicesHelpLabel,
        s.twoDevicesHelpIntro,
        ...s.twoDevicesHelpSteps,
      ]
    case 'export':
      return [dict.export.title, dict.export.description]
    case 'deleteRange':
      return [s.deleteRangeLabel, s.deleteRangeDescription, s.deleteRangeButton]
    case 'clearAllData':
      return [
        s.clearAllDataLabel,
        s.clearAllDataDescription,
        s.clearAllDataButton,
      ]
    default: {
      const exhaustive: never = card
      return exhaustive
    }
  }
}

function trackedRowLabels(id: string, dict: Dictionary): string[] {
  const s = dict.settings
  const day = dict.dailyEntry
  switch (id) {
    case 'sleep':
      return [day.sleepLabel, s.trackedFieldHintSleep]
    case 'bodyMeasurements':
      return [day.bodyMeasurementsLabel, s.trackedFieldHintBodyMeasurements]
    case 'bodyComposition':
      return [day.bodyCompositionLabel, s.trackedFieldHintBodyComposition]
    case 'morningNote':
      return [day.morningNoteLabel, s.trackedFieldHintMorningNote]
    case 'steps':
      return [day.stepsLabel, s.trackedFieldHintSteps]
    case 'note':
      return [day.noteLabel, s.trackedFieldHintNote]
    case 'mood':
      return [day.dayMoodLabel, s.trackedFieldHintMood]
    case 'constipation':
      return [s.digestionTrackingLabel, s.trackedFieldHintDigestion]
    case 'alcohol':
      return [s.alcoholTrackingLabel, s.trackedFieldHintAlcohol]
    case 'nightEating':
      return [
        day.nightEatingLabel(),
        day.nightEatingLabel('female'),
        day.nightEatingLabel('male'),
        s.trackedFieldHintNightEating,
      ]
    case 'cycle':
      return [s.cycleTrackingLabel, s.trackedFieldHintCycle]
    case 'water':
      return [s.waterTrackingLabel, s.trackedFieldHintWater]
    case 'dayTotals':
      return [day.dayTotalsLabel, s.trackedFieldHintDayTotals]
    case 'fiber':
      return [day.fiberLabel, s.trackedFieldHintFiber]
    case 'plannedMeals':
      return [s.plannedMealsTrackingLabel, s.trackedFieldHintPlannedMeals]
    case 'copyYesterdayMeals':
      return [
        s.copyYesterdayMealsTrackingLabel,
        s.trackedFieldHintCopyYesterdayMeals,
      ]
    case 'mealKcalVsYesterday':
      return [
        s.mealKcalVsYesterdayTrackingLabel,
        s.trackedFieldHintMealKcalVsYesterday,
      ]
    case 'ldlImpact':
      return [s.ldlImpactTrackingLabel, s.trackedFieldHintLdlImpact]
    case 'eatingReason':
      return [s.eatingReasonTrackingLabel, s.trackedFieldHintEatingReason]
    case 'autoSleepScreenshot':
      return [
        s.autoSleepScreenshotTrackingLabel,
        s.trackedFieldHintAutoSleepScreenshot,
      ]
    case 'zeppScreenshot':
      return [s.zeppScreenshotTrackingLabel, s.trackedFieldHintZeppScreenshot]
    case 'sodium':
      return [day.sodiumLabel, s.trackedFieldHintSodium]
    case 'potassium':
      return [day.potassiumLabel, s.trackedFieldHintPotassium]
    case 'magnesium':
      return [day.magnesiumLabel, s.trackedFieldHintMagnesium]
    case 'customEatingReasons':
      return [
        s.eatingReasonTrackingLabel,
        s.trackedFieldHintEatingReason,
        s.customEatingReasonsLabel,
        s.customEatingReasonsDescription,
      ]
    case 'catalogFoodImport':
      return [
        s.catalogFoodImportLabel,
        s.catalogFoodImportDescription,
        s.catalogFoodImportButton,
      ]
    default:
      return []
  }
}

const TRACKED_ROW_IDS = [
  'sleep',
  'bodyMeasurements',
  'bodyComposition',
  'morningNote',
  'steps',
  'note',
  'mood',
  'constipation',
  'alcohol',
  'nightEating',
  'cycle',
  'water',
  'dayTotals',
  'fiber',
  'plannedMeals',
  'copyYesterdayMeals',
  'mealKcalVsYesterday',
  'ldlImpact',
  'eatingReason',
  'autoSleepScreenshot',
  'zeppScreenshot',
  'sodium',
  'potassium',
  'magnesium',
  'customEatingReasons',
  'catalogFoodImport',
] as const

function rowLabels(card: SettingsCardKey, dict: Dictionary): Record<string, string[]> {
  const s = dict.settings
  switch (card) {
    case 'appearance':
      return {
        mood: [
          s.moodLabel,
          s.moodPond,
          s.moodDusk,
          s.moodSage,
          s.moodTortoise,
          s.moodLagoon,
        ],
        colorScheme: [s.colorSchemeLabel, s.systemColorScheme, s.light, s.dark],
      }
    case 'trackedFields':
      return Object.fromEntries(
        TRACKED_ROW_IDS.map((id) => [id, trackedRowLabels(id, dict)]),
      )
    case 'dashboardCharts':
      return Object.fromEntries(
        DEFAULT_DASHBOARD_SECTION_ORDER.map((key: DashboardChartKey) => [
          key,
          [dashboardChartTitle(key, dict)],
        ]),
      )
    case 'trendCharts':
      return {
        weight: [
          s.weightTrendLabel,
          dict.dashboard.weightLegend,
          dict.dashboard.rollingAverageLegend,
        ],
        calories: [
          s.calorieTrendLabel,
          dict.dashboard.caloriesLegend,
          dict.dashboard.rollingAverageLegend,
        ],
      }
    case 'export':
      return {
        jsonExport: [dict.export.exportBlurb, dict.export.exportButton],
        analysis: [
          dict.export.exportPeriodLabel,
          dict.export.exportEncryptedButton,
          dict.export.encryptedBackupBlurb,
          dict.export.exportRangedBackupButton,
          dict.export.exportPdfButton,
          dict.export.exportPdfBlurb,
          dict.export.exportExcelButton,
          dict.export.exportExcelBlurb,
          dict.export.exportCsvButton,
          dict.export.exportMarkdownButton,
        ],
        jsonImport: [dict.export.importBlurb, dict.export.importButton],
        zepp: [
          dict.zeppLifeImport.importBlurb,
          dict.zeppLifeImport.importButton,
        ],
        appleHealth: [
          dict.appleHealthImport.importBlurb,
          dict.appleHealthImport.importButton,
        ],
        myFitnessPal: [
          dict.myFitnessPalImport.importBlurb,
          dict.myFitnessPalImport.importButton,
        ],
      }
    default:
      return {}
  }
}

const SECTION_TEXTS: Record<SettingsCardKey, string[]> = Object.fromEntries(
  (Object.keys(SETTINGS_CARD_GROUPS).flatMap(
    (group) => SETTINGS_CARD_GROUPS[group as SettingsGroupId],
  ) as SettingsCardKey[])
    .concat(['about', 'features'])
    .map((card) => [card, bothLists((dict) => sectionLabels(card, dict))]),
) as Record<SettingsCardKey, string[]>

const ROW_TEXTS: Partial<Record<SettingsCardKey, Record<string, string[]>>> = {
  appearance: bothRowLists('appearance'),
  trackedFields: bothRowLists('trackedFields'),
  dashboardCharts: bothRowLists('dashboardCharts'),
  trendCharts: bothRowLists('trendCharts'),
  export: bothRowLists('export'),
}

function bothRowLists(card: SettingsCardKey): Record<string, string[]> {
  const merged: Record<string, string[]> = {}
  for (const locale of LOCALES) {
    const rows = rowLabels(card, getDictionary(locale))
    for (const [id, texts] of Object.entries(rows)) {
      merged[id] = [...(merged[id] ?? []), ...texts]
    }
  }
  return merged
}

function scopeOpen(card: SettingsCardKey, query: string): boolean {
  if (!settingsSearchQueryActive(query)) return true
  const group = cardGroup(card)
  if (group && settingsSearchMatches(query, groupTitleTexts(group))) return true
  return settingsSearchMatches(query, SECTION_TEXTS[card] ?? [])
}

export function settingsRowVisible(
  card: SettingsCardKey,
  rowId: string,
  query: string,
): boolean {
  if (scopeOpen(card, query)) return true
  const texts = ROW_TEXTS[card]?.[rowId]
  if (!texts) return false
  return settingsSearchMatches(query, texts)
}

export function settingsCardVisible(
  card: SettingsCardKey,
  query: string,
): boolean {
  if (scopeOpen(card, query)) return true
  const rows = ROW_TEXTS[card]
  if (!rows) return false
  return Object.values(rows).some((texts) => settingsSearchMatches(query, texts))
}

export function settingsGroupVisible(
  group: SettingsGroupId,
  query: string,
  keys: readonly SettingsCardKey[],
): boolean {
  if (!settingsSearchQueryActive(query)) return true
  if (settingsSearchMatches(query, groupTitleTexts(group))) return true
  return keys.some((key) => settingsCardVisible(key, query))
}
