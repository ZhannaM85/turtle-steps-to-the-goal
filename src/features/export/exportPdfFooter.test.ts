import { describe, expect, it } from 'vitest'
import { getDictionary } from '@/i18n'
import {
  drawPdfDocumentFooters,
  PDF_FOOTER_RESERVE_MM,
} from './exportPdfFooter'

const t = getDictionary('en')

describe('drawPdfDocumentFooters (#892)', () => {
  it('reads each page’s height so landscape daily-log pages do not pull the summary footer up', async () => {
    const { jsPDF } = await import('jspdf')
    const { PT_SANS_REGULAR_BASE64 } = await import('./ptSansRegularFont')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    doc.addFileToVFS('PTSans-Regular.ttf', PT_SANS_REGULAR_BASE64)
    doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')
    doc.addPage('a4', 'l')

    doc.setPage(1)
    const portraitHeight = doc.internal.pageSize.getHeight()
    doc.setPage(2)
    const landscapeHeight = doc.internal.pageSize.getHeight()
    expect(landscapeHeight).toBeLessThan(portraitHeight)
    expect(PDF_FOOTER_RESERVE_MM).toBeLessThan(landscapeHeight)
    expect(portraitHeight - PDF_FOOTER_RESERVE_MM).toBeGreaterThan(
      landscapeHeight,
    )

    drawPdfDocumentFooters(doc, t, 'Generated on 1 Jan 2026', 15)
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(0)
  })
})
