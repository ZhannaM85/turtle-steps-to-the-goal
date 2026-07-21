import type ExcelJS from 'exceljs'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
} from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import type { Dictionary } from '@/i18n'
import { effectiveMealLabel } from '@/shared/lib/mealLabel'

const DATE_FORMAT = 'yyyy-mm-dd'

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`)
}

/**
 * A separate, human-readable view of the same data the JSON backup covers
 * (#123) — not meant to be re-imported, so no schema versioning here,
 * unlike exportBundleSchema.ts. Numeric columns hold raw numbers (not
 * pre-formatted locale strings) so Excel can sum/chart them directly;
 * dates are real Date cells with a fixed yyyy-mm-dd format rather than
 * locale-dependent, so the file reads the same regardless of the
 * spreadsheet app's own locale settings.
 *
 * `exceljs` is dynamically imported here (not a static top-level import)
 * so it's only pulled into a chunk when this function actually runs —
 * ExportSection.tsx can import this module normally without paying for
 * the library on every Settings page load.
 */
export async function buildExportWorkbook(
  goals: Goal[],
  dailyEntries: DailyEntry[],
  t: Dictionary,
): Promise<ExcelJS.Workbook> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  const sortedEntries = [...dailyEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )

  const dailyLogSheet = workbook.addWorksheet(t.exportXlsx.dailyLogSheetName)
  dailyLogSheet.columns = [
    { header: t.exportXlsx.dateColumn, key: 'date', width: 12 },
    { header: t.exportXlsx.weightColumn, key: 'weight', width: 12 },
    { header: t.exportXlsx.caloriesColumn, key: 'calories', width: 14 },
    { header: t.exportXlsx.proteinColumn, key: 'protein', width: 12 },
    { header: t.exportXlsx.fatColumn, key: 'fat', width: 10 },
    { header: t.exportXlsx.carbsColumn, key: 'carbs', width: 12 },
    { header: t.exportXlsx.sleepHoursColumn, key: 'sleepHours', width: 12 },
    {
      header: t.exportXlsx.deepSleepHoursColumn,
      key: 'deepSleepHours',
      width: 14,
    },
    { header: t.exportXlsx.stepsColumn, key: 'steps', width: 10 },
    { header: t.exportXlsx.waistColumn, key: 'waist', width: 12 },
    { header: t.exportXlsx.hipColumn, key: 'hip', width: 12 },
    { header: t.exportXlsx.bodyFatColumn, key: 'bodyFat', width: 12 },
    { header: t.exportXlsx.moodColumn, key: 'mood', width: 10 },
    { header: t.exportXlsx.noteColumn, key: 'note', width: 30 },
    { header: t.exportXlsx.onPeriodColumn, key: 'onPeriod', width: 12 },
    {
      header: t.exportXlsx.hadConstipationColumn,
      key: 'hadConstipation',
      width: 14,
    },
  ]
  for (const entry of sortedEntries) {
    dailyLogSheet.addRow({
      date: toDate(entry.date),
      weight: entry.weightKg,
      calories: totalCalories(entry.calorieEntries),
      protein: totalProtein(entry.calorieEntries),
      fat: totalFat(entry.calorieEntries),
      carbs: totalCarbs(entry.calorieEntries),
      sleepHours: entry.sleepHours,
      deepSleepHours: entry.deepSleepHours,
      steps: entry.steps,
      waist: entry.waistCm,
      hip: entry.hipCm,
      bodyFat: entry.bodyFatPercent,
      mood: entry.emotion && t.dailyEntry.emotionLabel(entry.emotion),
      note: entry.note,
      onPeriod: entry.onPeriod,
      hadConstipation: entry.hadConstipation,
    })
  }
  dailyLogSheet.getColumn('date').numFmt = DATE_FORMAT

  const mealsSheet = workbook.addWorksheet(t.exportXlsx.mealsSheetName)
  mealsSheet.columns = [
    { header: t.exportXlsx.dateColumn, key: 'date', width: 12 },
    { header: t.exportXlsx.mealColumn, key: 'meal', width: 16 },
    { header: t.exportXlsx.itemColumn, key: 'item', width: 24 },
    { header: t.exportXlsx.brandColumn, key: 'brand', width: 16 },
    { header: t.exportXlsx.caloriesColumn, key: 'calories', width: 14 },
    { header: t.exportXlsx.proteinColumn, key: 'protein', width: 12 },
    { header: t.exportXlsx.fatColumn, key: 'fat', width: 10 },
    { header: t.exportXlsx.carbsColumn, key: 'carbs', width: 12 },
    { header: t.exportXlsx.gramsColumn, key: 'grams', width: 10 },
    { header: t.exportXlsx.timeColumn, key: 'time', width: 10 },
    { header: t.exportXlsx.reactionColumn, key: 'reaction', width: 12 },
    { header: t.exportXlsx.noteColumn, key: 'note', width: 30 },
  ]
  for (const entry of sortedEntries) {
    ;(entry.calorieEntries ?? []).forEach(
      (meal: CalorieEntry, index: number) => {
        const mealLabel = effectiveMealLabel(t, index + 1, meal.label)
        for (const item of meal.items) {
          mealsSheet.addRow({
            date: toDate(entry.date),
            meal: mealLabel,
            item: item.name,
            brand: item.brand,
            calories: item.amountKcal,
            protein: item.proteinG,
            fat: item.fatG,
            carbs: item.carbsG,
            grams: item.amountG,
            time: meal.timeEaten,
            // Per-dish reaction (#129) — used to be one shared value for
            // every item in the meal; each row now reflects that item's
            // own reaction instead.
            reaction:
              item.emotion && t.dailyEntry.mealEmotionLabel(item.emotion),
            note: meal.note,
          })
        }
      },
    )
  }
  mealsSheet.getColumn('date').numFmt = DATE_FORMAT

  const goalsSheet = workbook.addWorksheet(t.exportXlsx.goalsSheetName)
  goalsSheet.columns = [
    { header: t.exportXlsx.createdColumn, key: 'created', width: 12 },
    {
      header: t.exportXlsx.weeklyTargetColumn,
      key: 'weeklyTarget',
      width: 16,
    },
  ]
  const sortedGoals = [...goals].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
  for (const goal of sortedGoals) {
    goalsSheet.addRow({
      created: new Date(goal.createdAt),
      weeklyTarget: goal.targetWeeklyLossKg,
    })
  }
  goalsSheet.getColumn('created').numFmt = DATE_FORMAT

  return workbook
}
