import type { DailyEntry } from '@/domain/dailyEntry'
import type { Sex } from '@/domain/stats'
import type { Dictionary } from '@/i18n'
import {
  dailyLogHeaderValues,
  dailyLogRowValues,
  type DailyLogExportExtras,
} from './dailyLogExport'

export interface DailyLogPdfInput {
  entries: DailyEntry[]
  extras?: DailyLogExportExtras
  sex?: Sex
}

function formatPdfCell(
  value: string | number | boolean | undefined,
): string {
  if (value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'yes' : '—'
  return String(value)
}

/**
 * `#865` — optional landscape pages after the one-page summary.
 * Uses the same column projections as CSV/Excel (`dailyLogHeaderValues` /
 * `dailyLogRowValues`). Off unless the caller passes entries.
 */
export function appendDailyLogPdfPages(
  doc: import('jspdf').jsPDF,
  autoTable: typeof import('jspdf-autotable').default,
  input: DailyLogPdfInput,
  t: Dictionary,
): void {
  const entries = [...input.entries].sort((a, b) => a.date.localeCompare(b.date))
  if (entries.length === 0) return

  doc.addPage('a4', 'l')
  const marginX = 10
  doc.setFont('PTSans')
  doc.setFontSize(13)
  doc.setTextColor(0)
  doc.text(t.pdfSummary.dailyLogPagesTitle, marginX, 14)

  autoTable(doc, {
    startY: 20,
    margin: { left: marginX, right: marginX },
    head: [dailyLogHeaderValues(t, input.sex, input.extras)],
    body: entries.map((entry) =>
      dailyLogRowValues(entry, t, input.extras).map(formatPdfCell),
    ),
    theme: 'grid',
    styles: {
      fontSize: 6,
      font: 'PTSans',
      fontStyle: 'normal',
      cellPadding: 1,
      overflow: 'linebreak',
    },
    headStyles: { fillColor: [90, 90, 90], fontSize: 6, font: 'PTSans' },
  })
}
