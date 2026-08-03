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
import type { ExportBundle } from './exportBundleSchema'

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
): ExportBundle {
  return {
    version: 8,
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
  }
}
