import { describe, expect, it } from 'vitest'
import { getDictionary } from '@/i18n'
import {
  drawPdfDocumentFooters,
  measurePdfFooterReserveMm,
  pdfContentBottomMm,
} from './exportPdfFooter'

const tEn = getDictionary('en')
const tRu = getDictionary('ru')

describe('pdf footer band (#892)', () => {
  it('measures a taller reserve for the longer Russian disclaimer', async () => {
    const { jsPDF } = await import('jspdf')
    const { PT_SANS_REGULAR_BASE64 } = await import('./ptSansRegularFont')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    doc.addFileToVFS('PTSans-Regular.ttf', PT_SANS_REGULAR_BASE64)
    doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')

    const enReserve = measurePdfFooterReserveMm(doc, tEn, 15)
    const ruReserve = measurePdfFooterReserveMm(doc, tRu, 15)
    expect(ruReserve).toBeGreaterThanOrEqual(enReserve)
    expect(pdfContentBottomMm(doc, tRu, 15)).toBeLessThan(
      doc.internal.pageSize.getHeight() - 20,
    )
  })

  it('reads each page’s height so mixed orientations keep a clear footer band', async () => {
    const { jsPDF } = await import('jspdf')
    const { PT_SANS_REGULAR_BASE64 } = await import('./ptSansRegularFont')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    doc.addFileToVFS('PTSans-Regular.ttf', PT_SANS_REGULAR_BASE64)
    doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')
    doc.addPage('a4', 'l')

    doc.setPage(1)
    const portraitBottom = pdfContentBottomMm(doc, tRu, 15)
    doc.setPage(2)
    const landscapeBottom = pdfContentBottomMm(doc, tRu, 15)
    expect(landscapeBottom).toBeLessThan(portraitBottom)

    drawPdfDocumentFooters(doc, tRu, 'Создано 1 янв. 2026 г.', 15)
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(0)
  })
})
