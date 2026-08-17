import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import {
  hadNightEating,
  totalCalories,
  totalCarbs,
  totalFat,
  totalFiber,
  totalMagnesium,
  totalPotassium,
  totalProtein,
  totalSodium,
  totalWaterMl,
} from '@/domain/dailyEntry'
import type { CustomMetric, CustomMetricEntry } from '@/domain/customMetric'
import type { Sex } from '@/domain/stats'
import type { Dictionary } from '@/i18n'
import { effectiveMealLabel } from '@/shared/lib/mealLabel'

/** #743 — extra collections the daily-log table can project into columns. */
export interface DailyLogExportExtras {
  customMetrics?: CustomMetric[]
  customMetricEntries?: CustomMetricEntry[]
}

export interface MealLogRow {
  date: string
  meal: string
  item: string | undefined
  brand: string | undefined
  calories: number | undefined
  protein: number | undefined
  fat: number | undefined
  carbs: number | undefined
  fiber: number | undefined
  sodium: number | undefined
  potassium: number | undefined
  magnesium: number | undefined
  grams: number | undefined
  time: string | undefined
  reaction: string | undefined
  mealReaction: string | undefined
  itemNote: string | undefined
  note: string | undefined
}

function sortedCustomMetrics(
  extras?: DailyLogExportExtras,
): CustomMetric[] {
  return [...(extras?.customMetrics ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

function customMetricValue(
  metricId: string,
  date: string,
  extras?: DailyLogExportExtras,
): number | undefined {
  return extras?.customMetricEntries?.find(
    (entry) => entry.metricId === metricId && entry.date === date,
  )?.value
}

function customMetricHeader(metric: CustomMetric): string {
  return metric.unit ? `${metric.name} (${metric.unit})` : metric.name
}

export function dailyLogHeaderValues(
  t: Dictionary,
  sex?: Sex,
  extras?: DailyLogExportExtras,
): string[] {
  return [
    t.exportXlsx.dateColumn,
    t.exportXlsx.weightColumn,
    t.exportXlsx.caloriesColumn,
    t.exportXlsx.proteinColumn,
    t.exportXlsx.fatColumn,
    t.exportXlsx.carbsColumn,
    t.exportXlsx.sleepHoursColumn,
    t.exportXlsx.deepSleepHoursColumn,
    t.exportXlsx.stepsColumn,
    t.exportXlsx.waistColumn,
    t.exportXlsx.hipColumn,
    t.exportXlsx.bodyFatColumn,
    t.exportXlsx.moodColumn,
    t.exportXlsx.noteColumn,
    t.exportXlsx.onPeriodColumn,
    t.exportXlsx.hadConstipationColumn,
    t.exportXlsx.hadAlcoholColumn,
    t.exportXlsx.nightEatingColumn(sex),
    t.exportXlsx.waterColumn,
    t.exportXlsx.muscleMassColumn,
    t.exportXlsx.visceralFatColumn,
    t.exportXlsx.bodyWaterColumn,
    t.exportXlsx.boneMassColumn,
    t.exportXlsx.fiberColumn,
    t.exportXlsx.sodiumColumn,
    t.exportXlsx.potassiumColumn,
    t.exportXlsx.magnesiumColumn,
    ...sortedCustomMetrics(extras).map(customMetricHeader),
  ]
}

export function dailyLogRowValues(
  entry: DailyEntry,
  t: Dictionary,
  extras?: DailyLogExportExtras,
): (string | number | boolean | undefined)[] {
  return [
    entry.date,
    entry.weightKg,
    totalCalories(entry.calorieEntries, entry.dayTotals),
    totalProtein(entry.calorieEntries, entry.dayTotals),
    totalFat(entry.calorieEntries, entry.dayTotals),
    totalCarbs(entry.calorieEntries, entry.dayTotals),
    entry.sleepHours,
    entry.deepSleepHours,
    entry.steps,
    entry.waistCm,
    entry.hipCm,
    entry.bodyFatPercent,
    entry.emotion && t.dailyEntry.emotionLabel(entry.emotion),
    entry.note,
    entry.onPeriod,
    entry.hadConstipation,
    entry.hadAlcohol,
    hadNightEating(entry),
    totalWaterMl(entry.waterEntries),
    entry.muscleMassKg,
    entry.visceralFatRating,
    entry.bodyWaterPercent,
    entry.boneMassKg,
    totalFiber(entry.calorieEntries, entry.dayTotals),
    totalSodium(entry.calorieEntries),
    totalPotassium(entry.calorieEntries),
    totalMagnesium(entry.calorieEntries),
    ...sortedCustomMetrics(extras).map((metric) =>
      customMetricValue(metric.id, entry.date, extras),
    ),
  ]
}

export function mealLogHeaderValues(t: Dictionary): string[] {
  return [
    t.exportXlsx.dateColumn,
    t.exportXlsx.mealColumn,
    t.exportXlsx.itemColumn,
    t.exportXlsx.brandColumn,
    t.exportXlsx.caloriesColumn,
    t.exportXlsx.proteinColumn,
    t.exportXlsx.fatColumn,
    t.exportXlsx.carbsColumn,
    t.exportXlsx.fiberColumn,
    t.exportXlsx.sodiumColumn,
    t.exportXlsx.potassiumColumn,
    t.exportXlsx.magnesiumColumn,
    t.exportXlsx.gramsColumn,
    t.exportXlsx.timeColumn,
    t.exportXlsx.reactionColumn,
    t.exportXlsx.mealReactionColumn,
    t.exportXlsx.itemNoteColumn,
    t.exportXlsx.noteColumn,
  ]
}

export function mealLogRowValues(
  row: MealLogRow,
): (string | number | boolean | undefined)[] {
  return [
    row.date,
    row.meal,
    row.item,
    row.brand,
    row.calories,
    row.protein,
    row.fat,
    row.carbs,
    row.fiber,
    row.sodium,
    row.potassium,
    row.magnesium,
    row.grams,
    row.time,
    row.reaction,
    row.mealReaction,
    row.itemNote,
    row.note,
  ]
}

export function mealLogRows(
  dailyEntries: DailyEntry[],
  t: Dictionary,
): MealLogRow[] {
  const sortedEntries = [...dailyEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const rows: MealLogRow[] = []
  for (const entry of sortedEntries) {
    ;(entry.calorieEntries ?? []).forEach(
      (meal: CalorieEntry, index: number) => {
        const mealLabel = effectiveMealLabel(t, index + 1, meal.label)
        for (const item of meal.items) {
          rows.push({
            date: entry.date,
            meal: mealLabel,
            item: item.name,
            brand: item.brand,
            calories: item.amountKcal,
            protein: item.proteinG,
            fat: item.fatG,
            carbs: item.carbsG,
            fiber: item.fiberG,
            sodium: item.sodiumMg,
            potassium: item.potassiumMg,
            magnesium: item.magnesiumMg,
            grams: item.amountG,
            time: meal.timeEaten,
            reaction:
              item.emotion && t.dailyEntry.mealEmotionLabel(item.emotion),
            mealReaction:
              meal.reaction && t.dailyEntry.emotionLabel(meal.reaction),
            itemNote: item.noteText,
            note: meal.note,
          })
        }
      },
    )
  }
  return rows
}
