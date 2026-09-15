import type { Dictionary } from '@/i18n'

/** Breathing room above the first disclaimer line. */
const FOOTER_TOP_PAD_MM = 5
const GENERATED_FROM_BOTTOM_MM = 7
const DISCLAIMER_ABOVE_GENERATED_MM = 5
const DISCLAIMER_LINE_HEIGHT_MM = 3.5

/**
 * `#892` — how much bottom band the footer actually needs on this page
 * (disclaimer wraps by page width + locale). Content must stay above it.
 */
export function measurePdfFooterReserveMm(
  doc: import('jspdf').jsPDF,
  t: Dictionary,
  marginX: number,
): number {
  doc.setFont('PTSans')
  doc.setFontSize(8)
  const pageWidth = doc.internal.pageSize.getWidth()
  const disclaimerLines = doc.splitTextToSize(
    t.pdfSummary.disclaimer,
    pageWidth - marginX * 2,
  ) as string[]
  const disclaimerBlock =
    DISCLAIMER_ABOVE_GENERATED_MM +
    Math.max(1, disclaimerLines.length) * DISCLAIMER_LINE_HEIGHT_MM
  return GENERATED_FROM_BOTTOM_MM + disclaimerBlock + FOOTER_TOP_PAD_MM
}

/** Bottom Y content may use on the current page. */
export function pdfContentBottomMm(
  doc: import('jspdf').jsPDF,
  t: Dictionary,
  marginX: number,
): number {
  return (
    doc.internal.pageSize.getHeight() -
    measurePdfFooterReserveMm(doc, t, marginX)
  )
}

/**
 * `#892` — disclaimer + generated-on, measured from each page’s own
 * height/width so portrait summary and daily-log pages stay clear.
 */
export function drawPdfDocumentFooters(
  doc: import('jspdf').jsPDF,
  t: Dictionary,
  generatedOn: string,
  marginX: number,
): void {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    doc.setFont('PTSans')
    doc.setFontSize(8)
    doc.setTextColor(110)
    const generatedY = pageHeight - GENERATED_FROM_BOTTOM_MM
    const disclaimerLines = doc.splitTextToSize(
      t.pdfSummary.disclaimer,
      pageWidth - marginX * 2,
    ) as string[]
    const disclaimerY =
      generatedY -
      DISCLAIMER_ABOVE_GENERATED_MM -
      (disclaimerLines.length - 1) * DISCLAIMER_LINE_HEIGHT_MM
    doc.text(disclaimerLines, marginX, disclaimerY)
    doc.text(generatedOn, marginX, generatedY)
    doc.setTextColor(0)
  }
}
