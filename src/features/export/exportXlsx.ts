import type ExcelJS from 'exceljs'
import type { DailyEntry } from '@/domain/dailyEntry'
import { goalWeekEnd, type Goal } from '@/domain/goal'
import type { Sex } from '@/domain/stats'
import type { Dictionary } from '@/i18n'
import {
  dailyLogHeaderValues,
  dailyLogRowValues,
  includeWaterLogTable,
  mealLogHeaderValues,
  mealLogRows,
  mealLogRowValues,
  resolveAnalysisExportExtras,
  waterLogHeaderValues,
  waterLogRows,
  waterLogRowValues,
  type DailyLogExportExtras,
} from './dailyLogExport'

const DATE_FORMAT = 'yyyy-mm-dd'

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`)
}

function toOptionalDate(iso?: string): Date | undefined {
  if (!iso) return undefined
  return iso.includes('T') ? new Date(iso) : toDate(iso)
}

function excelRow(
  values: (string | number | boolean | undefined)[],
): (Date | string | number | boolean | undefined)[] {
  const [date, ...rest] = values
  return [typeof date === 'string' ? toDate(date) : date, ...rest]
}

function columnsFromHeaders(headers: string[]): { header: string; width: number }[] {
  return headers.map((header) => ({
    header,
    width: header.length > 18 ? 18 : 14,
  }))
}

/**
 * A separate, human-readable view of the same data the JSON backup covers
 * (#123) — not meant to be re-imported, so no schema versioning here,
 * unlike exportBundleSchema.ts. Numeric columns hold raw numbers (not
 * pre-formatted locale strings) so Excel can sum/chart them directly,
 * except sleep / deep sleep (#751) which are hours+minutes strings so
 * they match the Day card and AutoSleep screenshot. Dates are real Date
 * cells with a fixed yyyy-mm-dd format rather than locale-dependent, so
 * the file reads the same regardless of the spreadsheet app's own locale
 * settings.
 *
 * `exceljs` is dynamically imported here (not a static top-level import)
 * so it's only pulled into a chunk when this function actually runs —
 * ExportSection.tsx can import this module normally without paying for
 * the library on every Settings page load.
 *
 * #743: Daily Log columns include body composition, fiber, electrolytes,
 * and custom metrics; #853 adds a note column after each custom-metric
 * value. Meals gained fiber, electrolytes, whole-meal
 * reaction, and per-item note (meal note stays).
 */
export async function buildExportWorkbook(
  goals: Goal[],
  dailyEntries: DailyEntry[],
  t: Dictionary,
  sex?: Sex,
  extras?: DailyLogExportExtras,
): Promise<ExcelJS.Workbook> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  const sortedEntries = [...dailyEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const resolvedExtras = resolveAnalysisExportExtras(sortedEntries, extras)

  const dailyLogSheet = workbook.addWorksheet(t.exportXlsx.dailyLogSheetName)
  dailyLogSheet.columns = columnsFromHeaders(
    dailyLogHeaderValues(t, sex, resolvedExtras),
  )
  for (const entry of sortedEntries) {
    dailyLogSheet.addRow(excelRow(dailyLogRowValues(entry, t, resolvedExtras)))
  }
  dailyLogSheet.getColumn(1).numFmt = DATE_FORMAT

  const mealsSheet = workbook.addWorksheet(t.exportXlsx.mealsSheetName)
  mealsSheet.columns = columnsFromHeaders(mealLogHeaderValues(t, resolvedExtras))
  for (const row of mealLogRows(sortedEntries, t, resolvedExtras)) {
    mealsSheet.addRow(excelRow(mealLogRowValues(row, t, resolvedExtras)))
  }
  mealsSheet.getColumn(1).numFmt = DATE_FORMAT

  if (includeWaterLogTable(resolvedExtras)) {
    const waterSheet = workbook.addWorksheet(t.exportXlsx.waterEntriesSheetName)
    waterSheet.columns = columnsFromHeaders(waterLogHeaderValues(t))
    for (const row of waterLogRows(sortedEntries)) {
      waterSheet.addRow(excelRow(waterLogRowValues(row, t)))
    }
    waterSheet.getColumn(1).numFmt = DATE_FORMAT
  }

  const goalsSheet = workbook.addWorksheet(t.exportXlsx.goalsSheetName)
  goalsSheet.columns = [
    { header: t.exportXlsx.createdColumn, key: 'created', width: 12 },
    {
      header: t.exportXlsx.weeklyTargetColumn,
      key: 'weeklyTarget',
      width: 16,
    },
    { header: t.exportXlsx.weekStartColumn, key: 'weekStart', width: 12 },
    { header: t.exportXlsx.weekEndColumn, key: 'weekEnd', width: 12 },
    {
      header: t.exportXlsx.baselineWeightColumn,
      key: 'baselineWeight',
      width: 14,
    },
  ]
  const sortedGoals = [...goals].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
  for (const goal of sortedGoals) {
    const weekEnd = goal.weekEnd ?? (goal.weekStart ? goalWeekEnd(goal.weekStart) : undefined)
    goalsSheet.addRow({
      created: new Date(goal.createdAt),
      weeklyTarget: goal.targetWeeklyLossKg,
      weekStart: toOptionalDate(goal.weekStart),
      weekEnd: toOptionalDate(weekEnd),
      baselineWeight: goal.baselineWeightKg,
    })
  }
  goalsSheet.getColumn('created').numFmt = DATE_FORMAT
  goalsSheet.getColumn('weekStart').numFmt = DATE_FORMAT
  goalsSheet.getColumn('weekEnd').numFmt = DATE_FORMAT

  return workbook
}
