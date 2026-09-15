import { format } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { formatLocalizedDate, type Dictionary, type Locale } from '@/i18n'
import type { Unit } from '@/stores/unitStore'
import { buildSingleDayPdfDocumentHtml } from './buildPdfDocumentHtml'
import type { DailyLogPdfInput } from './exportPdfDailyLog'
import { renderHtmlDocumentToPdfBlob } from './renderHtmlDocumentToPdfBlob'

/**
 * #894 / #905 — a readable PDF for the day currently open in the share sheet.
 * HTML+CSS layout via the same pipeline as the Settings range PDF.
 */
export async function buildSingleDayPdf(
  entry: DailyEntry,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  extras?: DailyLogPdfInput['extras'],
): Promise<Blob> {
  const generatedOn = t.pdfSummary.generatedOnLabel(
    formatLocalizedDate(format(new Date(), 'yyyy-MM-dd'), locale),
  )
  const html = buildSingleDayPdfDocumentHtml(
    { entries: [entry], extras },
    t,
    locale,
    unit,
    generatedOn,
  )
  return renderHtmlDocumentToPdfBlob(html)
}
