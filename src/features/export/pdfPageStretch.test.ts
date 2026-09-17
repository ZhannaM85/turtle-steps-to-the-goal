import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  a4ContentCanvasHeightPx,
  packPdfPageElement,
  pdfFooterSourceFromCanvasBottom,
  pdfImageHeightMm,
  pdfPageStretchMetrics,
  pinPdfFooterToCanvasBottom,
} from './pinPdfFooterToCanvas'

describe('pinPdfFooterToCanvasBottom (#960)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not stretch a short capture onto an A4-tall canvas', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.innerHTML =
      '<div class="pdf-page-body">body</div><footer class="pdf-footer">Disclaimer</footer>'
    document.body.appendChild(page)
    const footer = page.querySelector('.pdf-footer') as HTMLElement
    vi.spyOn(footer, 'offsetHeight', 'get').mockReturnValue(40)
    vi.spyOn(page, 'scrollHeight', 'get').mockReturnValue(190)
    vi.spyOn(page, 'offsetHeight', 'get').mockReturnValue(190)

    try {
      expect(pdfFooterSourceFromCanvasBottom(285, page, 190)).toEqual({
        y: 225,
        height: 60,
      })
      const canvas = document.createElement('canvas')
      canvas.width = 1021
      canvas.height = 285
      const dest = pinPdfFooterToCanvasBottom(canvas)
      expect(dest).toBe(canvas)
      expect(dest.height).toBe(285)
      const placedMm = pdfImageHeightMm(dest.width, dest.height, 190)
      expect(placedMm).toBeLessThan(60)
      expect(placedMm).toBeGreaterThan(50)
      expect(placedMm).toBeLessThan(276)
    } finally {
      page.remove()
    }
  })

  it('leaves a full-height capture unchanged', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 980
    expect(pinPdfFooterToCanvasBottom(canvas)).toBe(canvas)
    expect(canvas.height).toBe(980)
  })
})

describe('pdfPageStretchMetrics (#960)', () => {
  it('flags a short capture placed as full A4 height', () => {
    const a4HeightPx = a4ContentCanvasHeightPx(1021, 190)
    const stretched = pdfPageStretchMetrics({
      canvasWidth: 1021,
      canvasHeight: a4HeightPx,
      sourceCanvasHeight: 285,
      captureHeightPx: 190,
      scale: 1.5,
      contentWidthMm: 190,
    })
    expect(stretched.placedMm).toBeGreaterThan(276)
    expect(stretched.naturalMm).toBeLessThan(60)
    expect(stretched.stretchPlacedOverNatural).toBeGreaterThan(4)
    expect(stretched.stretchFlagged).toBe(true)
  })

  it('reports stretch ~1 when canvas height matches capture × scale', () => {
    const natural = pdfPageStretchMetrics({
      canvasWidth: 1021,
      canvasHeight: 285,
      sourceCanvasHeight: 285,
      captureHeightPx: 190,
      scale: 1.5,
      contentWidthMm: 190,
    })
    expect(natural.placedMm).toBeLessThan(60)
    expect(natural.stretchPlacedOverNatural).toBeCloseTo(1, 5)
    expect(natural.stretchCanvasOverCaptureScaled).toBeCloseTo(1, 5)
    expect(natural.stretchFlagged).toBe(false)
  })
})

describe('packPdfPageElement (#960)', () => {
  it('top-packs water and notes so they cannot flex-stretch apart', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.innerHTML = `<div class="pdf-page-body">
      <section class="pdf-day-section pdf-day-section-water">
        <h3 class="pdf-day-section-title">Water</h3>
        <div class="pdf-day-section-content">
          <p class="pdf-day-item">09:00</p>
        </div>
      </section>
      <section class="pdf-day-section pdf-day-section-notes">
        <h3 class="pdf-day-section-title">Notes</h3>
        <div class="pdf-day-section-content"><p class="pdf-line">walk</p></div>
      </section>
    </div><footer class="pdf-footer">Disclaimer</footer>`
    document.body.appendChild(page)
    try {
      packPdfPageElement(page)
      const water = page.querySelector<HTMLElement>('.pdf-day-section-water')
      const notes = page.querySelector<HTMLElement>('.pdf-day-section-notes')
      const notesBody = notes?.querySelector<HTMLElement>(
        '.pdf-day-section-content',
      )
      expect(water?.style.alignContent).toBe('start')
      expect(water?.style.minHeight).toBe('0px')
      expect(notes?.style.alignContent).toBe('start')
      expect(notesBody?.style.minHeight).toBe('0px')
      expect(notes?.querySelector('.pdf-day-section-title')?.textContent).toBe(
        'Notes',
      )
      expect(notesBody?.textContent).toContain('walk')
    } finally {
      page.remove()
    }
  })
})

describe('a4ContentCanvasHeightPx (#939)', () => {
  it('sizes the A4 debug target for a ~10mm PDF bottom margin', () => {
    const heightPx = a4ContentCanvasHeightPx(1021, 190)
    const imgHeightMm = (heightPx * 190) / 1021
    expect(imgHeightMm).toBeGreaterThan(276)
    expect(imgHeightMm).toBeLessThanOrEqual(277)
    expect(297 - 10 - imgHeightMm).toBeGreaterThan(10)
    expect(297 - 10 - imgHeightMm).toBeLessThan(11)
  })
})
