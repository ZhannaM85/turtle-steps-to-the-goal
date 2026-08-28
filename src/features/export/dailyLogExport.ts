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
import { effectiveMealLabel, effectiveTimeEaten, type MealSlotDefaultTimes } from '@/shared/lib/mealLabel'
import { eatingReasonDisplayLabel, type EatingReasonLabelOverrides } from '@/shared/lib/eatingReasonDisplay'
import { formatSleepDuration } from '@/shared/lib/sleepDuration'

/** #743 — extra collections the daily-log table can project into columns.
 * #744 — optional `tracking` omits columns whose Settings gate is off. */
export interface DailyLogExportExtras {
  customMetrics?: CustomMetric[]
  customMetricEntries?: CustomMetricEntry[]
  tracking?: AnalysisExportTrackingGate
  /** #754 — Settings slot clocks so Time matches Day's `effectiveTimeEaten`. */
  mealSlotTimes?: MealSlotDefaultTimes
  /** #766 — display-label overrides for built-in eating reasons. */
  eatingReasonLabelOverrides?: EatingReasonLabelOverrides
}

/**
 * #744 — Settings → What to track (and the older opt-in stores) for
 * analysis exports. JSON backup stays complete and does not use this.
 * A missing `tracking` object means "include every column" (unit tests
 * and any caller that wants the full #743 layout).
 */
export interface AnalysisExportTrackingGate {
  sleep: boolean
  steps: boolean
  bodyMeasurements: boolean
  note: boolean
  morningNote: boolean
  mood: boolean
  bodyComposition: boolean
  nightEating: boolean
  fiber: boolean
  cycle: boolean
  digestion: boolean
  alcohol: boolean
  water: boolean
  sodium: boolean
  potassium: boolean
  magnesium: boolean
  eatingReason: boolean
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
  eatingReason: string | undefined
  itemNote: string | undefined
  note: string | undefined
}

type ExportCell = string | number | boolean | undefined

interface ProjectedColumn<T> {
  header: string
  value: (row: T) => ExportCell
  gatedBy?: keyof AnalysisExportTrackingGate
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

function isIncluded<T>(
  column: ProjectedColumn<T>,
  tracking?: AnalysisExportTrackingGate,
): boolean {
  if (!column.gatedBy) return true
  if (!tracking) return true
  return tracking[column.gatedBy]
}

/** #751 — analysis exports print h+m like the Day card, not decimal hours. */
function exportedSleepDuration(
  hours: number | undefined,
  t: Dictionary,
): string | undefined {
  if (hours === undefined) return undefined
  return formatSleepDuration(
    hours,
    t.dailyEntry.hoursUnit,
    t.dailyEntry.minutesUnit,
  )
}

function dailyLogColumns(
  t: Dictionary,
  sex?: Sex,
  extras?: DailyLogExportExtras,
): ProjectedColumn<DailyEntry>[] {
  const columns: ProjectedColumn<DailyEntry>[] = [
    { header: t.exportXlsx.dateColumn, value: (entry) => entry.date },
    { header: t.exportXlsx.weightColumn, value: (entry) => entry.weightKg },
    {
      header: t.exportXlsx.caloriesColumn,
      value: (entry) => totalCalories(entry.calorieEntries, entry.dayTotals),
    },
    {
      header: t.exportXlsx.proteinColumn,
      value: (entry) => totalProtein(entry.calorieEntries, entry.dayTotals),
    },
    {
      header: t.exportXlsx.fatColumn,
      value: (entry) => totalFat(entry.calorieEntries, entry.dayTotals),
    },
    {
      header: t.exportXlsx.carbsColumn,
      value: (entry) => totalCarbs(entry.calorieEntries, entry.dayTotals),
    },
    {
      header: t.exportXlsx.sleepHoursColumn,
      value: (entry) => exportedSleepDuration(entry.sleepHours, t),
      gatedBy: 'sleep',
    },
    {
      header: t.exportXlsx.deepSleepHoursColumn,
      value: (entry) => exportedSleepDuration(entry.deepSleepHours, t),
      gatedBy: 'sleep',
    },
    {
      header: t.exportXlsx.stepsColumn,
      value: (entry) => entry.steps,
      gatedBy: 'steps',
    },
    {
      header: t.exportXlsx.waistColumn,
      value: (entry) => entry.waistCm,
      gatedBy: 'bodyMeasurements',
    },
    {
      header: t.exportXlsx.hipColumn,
      value: (entry) => entry.hipCm,
      gatedBy: 'bodyMeasurements',
    },
    {
      header: t.exportXlsx.bodyFatColumn,
      value: (entry) => entry.bodyFatPercent,
      gatedBy: 'bodyComposition',
    },
    {
      header: t.exportXlsx.moodColumn,
      value: (entry) =>
        entry.emotion && t.dailyEntry.emotionLabel(entry.emotion),
      gatedBy: 'mood',
    },
    {
      header: t.exportXlsx.morningNoteColumn,
      value: (entry) => entry.morningNote,
      gatedBy: 'morningNote',
    },
    {
      header: t.exportXlsx.noteColumn,
      value: (entry) => entry.note,
      gatedBy: 'note',
    },
    {
      header: t.exportXlsx.onPeriodColumn,
      value: (entry) => entry.onPeriod,
      gatedBy: 'cycle',
    },
    {
      header: t.exportXlsx.hadConstipationColumn,
      value: (entry) => entry.hadConstipation,
      gatedBy: 'digestion',
    },
    {
      header: t.exportXlsx.hadAlcoholColumn,
      value: (entry) => entry.hadAlcohol,
      gatedBy: 'alcohol',
    },
    {
      header: t.exportXlsx.nightEatingColumn(sex),
      value: (entry) => hadNightEating(entry),
      gatedBy: 'nightEating',
    },
    {
      header: t.exportXlsx.waterColumn,
      value: (entry) => totalWaterMl(entry.waterEntries),
      gatedBy: 'water',
    },
    {
      header: t.exportXlsx.muscleMassColumn,
      value: (entry) => entry.muscleMassKg,
      gatedBy: 'bodyComposition',
    },
    {
      header: t.exportXlsx.visceralFatColumn,
      value: (entry) => entry.visceralFatRating,
      gatedBy: 'bodyComposition',
    },
    {
      header: t.exportXlsx.bodyWaterColumn,
      value: (entry) => entry.bodyWaterPercent,
      gatedBy: 'bodyComposition',
    },
    {
      header: t.exportXlsx.boneMassColumn,
      value: (entry) => entry.boneMassKg,
      gatedBy: 'bodyComposition',
    },
    {
      header: t.exportXlsx.fiberColumn,
      value: (entry) => totalFiber(entry.calorieEntries, entry.dayTotals),
      gatedBy: 'fiber',
    },
    {
      header: t.exportXlsx.sodiumColumn,
      value: (entry) => totalSodium(entry.calorieEntries),
      gatedBy: 'sodium',
    },
    {
      header: t.exportXlsx.potassiumColumn,
      value: (entry) => totalPotassium(entry.calorieEntries),
      gatedBy: 'potassium',
    },
    {
      header: t.exportXlsx.magnesiumColumn,
      value: (entry) => totalMagnesium(entry.calorieEntries),
      gatedBy: 'magnesium',
    },
    ...sortedCustomMetrics(extras).map((metric) => ({
      header: customMetricHeader(metric),
      value: (entry: DailyEntry) =>
        customMetricValue(metric.id, entry.date, extras),
    })),
  ]
  return columns.filter((column) => isIncluded(column, extras?.tracking))
}

function mealLogColumns(
  t: Dictionary,
  extras?: DailyLogExportExtras,
): ProjectedColumn<MealLogRow>[] {
  const columns: ProjectedColumn<MealLogRow>[] = [
    { header: t.exportXlsx.dateColumn, value: (row) => row.date },
    { header: t.exportXlsx.mealColumn, value: (row) => row.meal },
    { header: t.exportXlsx.itemColumn, value: (row) => row.item },
    { header: t.exportXlsx.brandColumn, value: (row) => row.brand },
    { header: t.exportXlsx.caloriesColumn, value: (row) => row.calories },
    { header: t.exportXlsx.proteinColumn, value: (row) => row.protein },
    { header: t.exportXlsx.fatColumn, value: (row) => row.fat },
    { header: t.exportXlsx.carbsColumn, value: (row) => row.carbs },
    {
      header: t.exportXlsx.fiberColumn,
      value: (row) => row.fiber,
      gatedBy: 'fiber',
    },
    {
      header: t.exportXlsx.sodiumColumn,
      value: (row) => row.sodium,
      gatedBy: 'sodium',
    },
    {
      header: t.exportXlsx.potassiumColumn,
      value: (row) => row.potassium,
      gatedBy: 'potassium',
    },
    {
      header: t.exportXlsx.magnesiumColumn,
      value: (row) => row.magnesium,
      gatedBy: 'magnesium',
    },
    { header: t.exportXlsx.gramsColumn, value: (row) => row.grams },
    { header: t.exportXlsx.timeColumn, value: (row) => row.time },
    { header: t.exportXlsx.reactionColumn, value: (row) => row.reaction },
    {
      header: t.exportXlsx.mealReactionColumn,
      value: (row) => row.mealReaction,
    },
    {
      header: t.exportXlsx.eatingReasonColumn,
      value: (row) => row.eatingReason,
      gatedBy: 'eatingReason',
    },
    { header: t.exportXlsx.itemNoteColumn, value: (row) => row.itemNote },
    { header: t.exportXlsx.noteColumn, value: (row) => row.note },
  ]
  return columns.filter((column) => isIncluded(column, extras?.tracking))
}

export function dailyLogHeaderValues(
  t: Dictionary,
  sex?: Sex,
  extras?: DailyLogExportExtras,
): string[] {
  return dailyLogColumns(t, sex, extras).map((column) => column.header)
}

export function dailyLogRowValues(
  entry: DailyEntry,
  t: Dictionary,
  extras?: DailyLogExportExtras,
): ExportCell[] {
  return dailyLogColumns(t, undefined, extras).map((column) =>
    column.value(entry),
  )
}

export function mealLogHeaderValues(
  t: Dictionary,
  extras?: DailyLogExportExtras,
): string[] {
  return mealLogColumns(t, extras).map((column) => column.header)
}

export function mealLogRowValues(
  row: MealLogRow,
  t: Dictionary,
  extras?: DailyLogExportExtras,
): ExportCell[] {
  return mealLogColumns(t, extras).map((column) => column.value(row))
}

export function mealLogRows(
  dailyEntries: DailyEntry[],
  t: Dictionary,
  extras?: DailyLogExportExtras,
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
            time: effectiveTimeEaten(meal, extras?.mealSlotTimes),
            reaction:
              item.emotion && t.dailyEntry.mealEmotionLabel(item.emotion),
            mealReaction:
              meal.reaction && t.dailyEntry.emotionLabel(meal.reaction),
            eatingReason:
              meal.eatingReason &&
              eatingReasonDisplayLabel(
                meal.eatingReason,
                t,
                extras?.eatingReasonLabelOverrides,
              ),
            itemNote: item.noteText,
            note: meal.note,
          })
        }
      },
    )
  }
  return rows
}
