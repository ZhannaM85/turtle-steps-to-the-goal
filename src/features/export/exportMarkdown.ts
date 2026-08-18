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

function mdField(value: string | number | boolean | undefined): string {
  if (value === undefined) return ''
  // A raw pipe would split into extra columns, and a raw newline would
  // break the row onto its own line — both escaped/collapsed rather than
  // rejected, same spirit as exportCsv.ts's RFC 4180 quoting.
  // #706 — escape backslashes first so `\|` stays a literal escape of `|`
  // (CodeQL `js/incomplete-sanitization`).
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

function mdRow(values: (string | number | boolean | undefined)[]): string {
  return `| ${values.map(mdField).join(' | ')} |`
}

function mdTable(
  headers: string[],
  rows: (string | number | boolean | undefined)[][],
): string {
  const headerRow = mdRow(headers)
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
  return [headerRow, separatorRow, ...rows.map(mdRow)].join('\n')
}

/**
 * Same "Daily Log" table shape as exportCsv.ts's `buildDailyLogCsv` (#219)
 * — a GitHub-flavored Markdown table instead of CSV, for pasting into a
 * notes app or a Markdown-rendering chat tool rather than a spreadsheet.
 *
 * #743: same extra Daily Log columns as CSV/Excel, plus a second Meals
 * table after a blank line.
 */
export function buildDailyLogMarkdown(
  dailyEntries: DailyEntry[],
  t: Dictionary,
  sex?: Sex,
  extras?: DailyLogExportExtras,
): string {
  const sortedEntries = [...dailyEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const daily = mdTable(
    dailyLogHeaderValues(t, sex, extras),
    sortedEntries.map((entry) => dailyLogRowValues(entry, t, extras)),
  )
  const meals = mdTable(
    mealLogHeaderValues(t, extras),
    mealLogRows(sortedEntries, t, extras).map((row) =>
      mealLogRowValues(row, t, extras),
    ),
  )
  return `${daily}\n\n${meals}`
}
