import type {
  CustomCorrelation,
  CustomMetric,
  CustomMetricEntry,
} from '@/domain/customMetric'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { FoodOverride } from '@/domain/foodOverride'
import type { Goal } from '@/domain/goal'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import type { WeeklyNote } from '@/domain/weeklyNote'
import type { Locale } from '@/i18n'
import type { ColorScheme, Mood } from '@/stores/themeStore'
import type { ExportBundle } from './exportBundleSchema'

export type ExportAppearance = {
  mood: Mood
  colorScheme: ColorScheme
}

export function buildExportBundle(
  goals: Goal[],
  dailyEntries: DailyEntry[],
  mealItems: MealItem[],
  foodOverrides: FoodOverride[],
  recipes: Recipe[],
  customMetrics: CustomMetric[],
  customMetricEntries: CustomMetricEntry[],
  customCorrelations: CustomCorrelation[],
  weeklyNotes: WeeklyNote[],
  // #578 — always written on fresh export; optional on the schema so older
  // backups still parse. Defaults keep existing call sites compiling.
  appearance: ExportAppearance = { mood: 'pond', colorScheme: 'system' },
  locale: Locale = 'en',
): ExportBundle {
  return {
    version: 9,
    exportedAt: new Date().toISOString(),
    goals,
    dailyEntries,
    mealItems,
    foodOverrides,
    recipes,
    customMetrics,
    customMetricEntries,
    customCorrelations,
    weeklyNotes,
    appearance,
    locale,
  }
}
