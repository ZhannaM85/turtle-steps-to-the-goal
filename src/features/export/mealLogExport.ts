import {
  cholesterolForFoodRecord,
  type CholesterolImpact,
} from '@/domain/cholesterol'
import {
  mealEatingReasons,
  type CalorieEntry,
  type DailyEntry,
} from '@/domain/dailyEntry'
import type { Dictionary } from '@/i18n'
import { cholesterolImpactLabel } from '@/shared/lib/cholesterolImpactLabel'
import { formatEatingReasonsLine } from '@/shared/lib/eatingReasonDisplay'
import { effectiveMealLabel, effectiveTimeEaten } from '@/shared/lib/mealLabel'
import type {
  AnalysisExportTrackingGate,
  DailyLogExportExtras,
} from './dailyLogExport'

/** #743 / #1026 — one Meals-table row. LDL cells are qualitative labels. */
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
  /** Localized LDL impact (helps / neutral / … / unknown). */
  ldlImpact: string
  ldlReason: string | undefined
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

function isIncluded<T>(
  column: ProjectedColumn<T>,
  tracking?: AnalysisExportTrackingGate,
): boolean {
  if (!column.gatedBy) return true
  if (!tracking) return true
  return tracking[column.gatedBy]
}

/** Same label and reason the Day chip shows for this dish. */
export function mealItemLdlExport(
  item: {
    name?: string
    cholesterolImpact?: CholesterolImpact
    cholesterolReason?: string
  },
  t: Dictionary,
): { impact: string; reason: string | undefined } {
  const classified = cholesterolForFoodRecord(item)
  const reason = classified.cholesterolReason?.trim()
  return {
    impact: cholesterolImpactLabel(classified.cholesterolImpact, t),
    reason: reason ? reason : undefined,
  }
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
    {
      header: t.exportXlsx.ldlImpactColumn,
      value: (row) => row.ldlImpact,
      gatedBy: 'ldlImpact',
    },
    {
      header: t.exportXlsx.ldlReasonColumn,
      value: (row) => row.ldlReason,
      gatedBy: 'ldlImpact',
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
        const reasons = mealEatingReasons(meal)
        const eatingReasonLine =
          reasons.length > 0
            ? formatEatingReasonsLine(
                reasons,
                t,
                extras?.eatingReasonLabelOverrides,
              )
            : undefined
        for (const item of meal.items) {
          const ldl = mealItemLdlExport(item, t)
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
            ldlImpact: ldl.impact,
            ldlReason: ldl.reason,
            grams: item.amountG,
            time: effectiveTimeEaten(meal, extras?.mealSlotTimes),
            reaction:
              item.emotion && t.dailyEntry.mealEmotionLabel(item.emotion),
            mealReaction:
              meal.reaction && t.dailyEntry.emotionLabel(meal.reaction),
            eatingReason: eatingReasonLine,
            itemNote: item.noteText,
            note: meal.note,
          })
        }
      },
    )
  }
  return rows
}
