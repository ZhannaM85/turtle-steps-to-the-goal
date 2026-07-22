import type { DailyEntry } from '@/domain/dailyEntry'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  totalWaterMl,
} from '@/domain/dailyEntry'
import type { Dictionary } from '@/i18n'

/** UTF-8 byte-order mark — prepend to the CSV Blob so Excel correctly
 * detects the encoding and doesn't mangle Cyrillic notes/mood labels if
 * the file is opened there instead of pasted into an LLM. Named/exported
 * rather than an inline literal since U+FEFF is otherwise invisible in a
 * diff. */
export const CSV_BOM = '﻿'

function csvField(value: string | number | boolean | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  // RFC 4180: quote (and double up embedded quotes) any field containing a
  // comma, quote, or newline — plain fields are left bare.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvRow(values: (string | number | boolean | undefined)[]): string {
  return values.map(csvField).join(',')
}

/**
 * Same "Daily Log" shape as exportXlsx.ts's first sheet (#123), as flat
 * CSV text — no `exceljs` dependency needed for this, CSV is simple enough
 * to hand-write. Meant for pasting into an LLM conversation for analysis
 * (#125): CSV is far more token-efficient than JSON (no repeated key names
 * per row) and parses more reliably than a binary .xlsx.
 *
 * #225: waist/hip/body fat columns added alongside sleep/steps.
 */
export function buildDailyLogCsv(
  dailyEntries: DailyEntry[],
  t: Dictionary,
): string {
  const sortedEntries = [...dailyEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const header = csvRow([
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
    t.exportXlsx.waterColumn,
  ])
  const rows = sortedEntries.map((entry) =>
    csvRow([
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
      totalWaterMl(entry.waterEntries),
    ]),
  )
  // CRLF line endings per RFC 4180.
  return [header, ...rows].join('\r\n')
}
