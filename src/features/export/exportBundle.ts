import type { DailyEntry } from '@/domain/dailyEntry'
import type { FoodOverride } from '@/domain/foodOverride'
import type { Goal } from '@/domain/goal'
import type { MealItem } from '@/domain/mealItem'
import type { ExportBundle } from './exportBundleSchema'

export function buildExportBundle(
  goals: Goal[],
  dailyEntries: DailyEntry[],
  mealItems: MealItem[],
  foodOverrides: FoodOverride[],
): ExportBundle {
  return {
    version: 6,
    exportedAt: new Date().toISOString(),
    goals,
    dailyEntries,
    mealItems,
    foodOverrides,
  }
}
