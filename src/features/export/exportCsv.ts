import type { DailyEntry } from '@/domain/dailyEntry'
import type { Sex } from '@/domain/stats'
import type { Dictionary } from '@/i18n'
import {
  dailyLogHeaderValues,
  dailyLogRowValues,
  mealLogHeaderValues,
  mealLogRows,
  mealLogRowValues,
  type DailyLogExportExtras,
} from './dailyLogExport'

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

function csvTable(
  header: (string | number | boolean | undefined)[],
  rows: (string | number | boolean | undefined)[][],
): string {
  return [csvRow(header), ...rows.map(csvRow)].join('\r\n')
}

/**
 * #829 / #832 — Next Morning Weight column only on one-day CSV when the
 * caller passes `extras.nextMorningWeightByDate` (Send day). Header is
 * `t.exportXlsx.nextMorningWeightColumn`. Interval Settings CSV does not
 * pass that map, so Excel/Markdown/range CSV stay unchanged.
 */
function withNextMorningWeightColumn(
  headers: (string | number | boolean | undefined)[],
  rows: (string | number | boolean | undefined)[][],
  sortedEntries: DailyEntry[],
  t: Dictionary,
  extras?: DailyLogExportExtras,
): [
  (string | number | boolean | undefined)[],
  (string | number | boolean | undefined)[][],
] {
  if (extras?.nextMorningWeightByDate === undefined) {
    return [headers, rows]
  }
  return [
    [
      headers[0],
      headers[1],
      t.exportXlsx.nextMorningWeightColumn,
      ...headers.slice(2),
    ],
    rows.map((row, index) => [
      row[0],
      row[1],
      extras.nextMorningWeightByDate?.[sortedEntries[index]!.date],
      ...row.slice(2),
    ]),
  ]
}

/**
 * Same "Daily Log" shape as exportXlsx.ts's first sheet (#123), as flat
 * CSV text — no `exceljs` dependency needed for this, CSV is simple enough
 * to hand-write. Meant for pasting into an LLM conversation for analysis
 * (#125): CSV is far more token-efficient than JSON (no repeated key names
 * per row) and parses more reliably than a binary .xlsx.
 *
 * #225: waist/hip/body fat columns added alongside sleep/steps.
 * #743: Daily Log also includes body composition, fiber, electrolytes, and
 * custom-metric columns; a second Meals table follows after a blank line
 * (Excel already had that sheet — CSV/Markdown had been one table only).
 */
export function buildDailyLogCsv(
  dailyEntries: DailyEntry[],
  t: Dictionary,
  sex?: Sex,
  extras?: DailyLogExportExtras,
): string {
  const sortedEntries = [...dailyEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const daily = csvTable(
    ...withNextMorningWeightColumn(
      dailyLogHeaderValues(t, sex, extras),
      sortedEntries.map((entry) => dailyLogRowValues(entry, t, extras)),
      sortedEntries,
      t,
      extras,
    ),
  )
  const meals = csvTable(
    mealLogHeaderValues(t, extras),
    mealLogRows(sortedEntries, t, extras).map((row) =>
      mealLogRowValues(row, t, extras),
    ),
  )
  return `${daily}\r\n\r\n${meals}`
}
