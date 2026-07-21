import type { DailyEntry } from '@/domain/dailyEntry'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
} from '@/domain/dailyEntry'
import type { Dictionary } from '@/i18n'

function mdField(value: string | number | boolean | undefined): string {
  if (value === undefined) return ''
  // A raw pipe would split into extra columns, and a raw newline would
  // break the row onto its own line — both escaped/collapsed rather than
  // rejected, same spirit as exportCsv.ts's RFC 4180 quoting.
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

function mdRow(values: (string | number | boolean | undefined)[]): string {
  return `| ${values.map(mdField).join(' | ')} |`
}

/**
 * Same "Daily Log" table shape as exportCsv.ts's `buildDailyLogCsv` (#219)
 * — a GitHub-flavored Markdown table instead of CSV, for pasting into a
 * notes app or a Markdown-rendering chat tool rather than a spreadsheet.
 */
export function buildDailyLogMarkdown(
  dailyEntries: DailyEntry[],
  t: Dictionary,
): string {
  const sortedEntries = [...dailyEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const headers = [
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
  ]
  const headerRow = mdRow(headers)
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
  const rows = sortedEntries.map((entry) =>
    mdRow([
      entry.date,
      entry.weightKg,
      totalCalories(entry.calorieEntries),
      totalProtein(entry.calorieEntries),
      totalFat(entry.calorieEntries),
      totalCarbs(entry.calorieEntries),
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
    ]),
  )
  return [headerRow, separatorRow, ...rows].join('\n')
}
