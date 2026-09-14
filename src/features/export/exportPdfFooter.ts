import type { Dictionary } from '@/i18n'

/**
 * `#892` — disclaimer + generated-on live in this bottom band. Content
 * (autoTable, summary text) must stay above it on every page, including
 * mixed portrait summary + landscape daily-log.
 */
export const PDF_FOOTER_RESERVE_MM = 24

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
    const generatedY = pageHeight - 7
    const disclaimerLines = doc.splitTextToSize(
      t.pdfSummary.disclaimer,
      pageWidth - marginX * 2,
    )
    const lineHeight = 3.5
    const disclaimerY =
      generatedY - 5 - (disclaimerLines.length - 1) * lineHeight
    doc.text(disclaimerLines, marginX, disclaimerY)
    doc.text(generatedOn, marginX, generatedY)
    doc.setTextColor(0)
  }
}
