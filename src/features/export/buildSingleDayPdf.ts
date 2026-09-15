import { format } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { formatLocalizedDate, type Dictionary, type Locale } from '@/i18n'
import type { Unit } from '@/stores/unitStore'
import {
  appendDailyLogPdfPages,
  type DailyLogPdfInput,
} from './exportPdfDailyLog'
import { drawPdfDocumentFooters } from './exportPdfFooter'

/**
 * #894 — a readable PDF for the day currently open in the share sheet.
 * This deliberately does not use the Settings range-summary PDF.
 */
export async function buildSingleDayPdf(
  entry: DailyEntry,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  extras?: DailyLogPdfInput['extras'],
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const { PT_SANS_REGULAR_BASE64 } = await import('./ptSansRegularFont')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.addFileToVFS('PTSans-Regular.ttf', PT_SANS_REGULAR_BASE64)
  doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')
  doc.setFont('PTSans')

  appendDailyLogPdfPages(
    doc,
    { entries: [entry], extras },
    t,
    locale,
    unit,
    false,
  )
  drawPdfDocumentFooters(
    doc,
    t,
    t.pdfSummary.generatedOnLabel(
      formatLocalizedDate(format(new Date(), 'yyyy-MM-dd'), locale),
    ),
    15,
  )

  return doc.output('blob')
}
