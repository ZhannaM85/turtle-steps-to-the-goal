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

  it('pins the footer on A4 paper without scaling body or footer pixels', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.innerHTML =
      '<div class="pdf-page-body">body</div><footer class="pdf-footer">Disclaimer</footer>'
    document.body.appendChild(page)
    const footer = page.querySelector('.pdf-footer') as HTMLElement
    vi.spyOn(page, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 100, 100, 190),
    )
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 250, 100, 40),
    )
    // A bad WebKit offsetHeight must not pull Water/Notes into the footer slice.
    vi.spyOn(footer, 'offsetHeight', 'get').mockReturnValue(120)
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
      const drawImage = vi.fn()
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage,
      } as unknown as CanvasRenderingContext2D)
      const destHeight = a4ContentCanvasHeightPx(canvas.width, 190)
      const dest = pinPdfFooterToCanvasBottom(
        canvas,
        page,
        destHeight,
        190,
      )
      expect(dest).not.toBe(canvas)
      expect(dest.height).toBe(destHeight)
      expect(drawImage).toHaveBeenNthCalledWith(
        1,
        canvas,
        0,
        0,
        1021,
        225,
        0,
        0,
        1021,
        225,
      )
      expect(drawImage).toHaveBeenNthCalledWith(
        2,
        canvas,
        0,
        225,
        1021,
        60,
        0,
        destHeight - 60,
        1021,
        60,
      )
      const placedMm = pdfImageHeightMm(dest.width, dest.height, 190)
      expect(placedMm).toBeGreaterThan(276)
      expect(297 - 10 - placedMm).toBeGreaterThan(10)
    } finally {
      page.remove()
    }
  })

  it('leaves a full-height capture unchanged', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 980
    const page = document.createElement('section')
    expect(pinPdfFooterToCanvasBottom(canvas, page, 980, 980)).toBe(canvas)
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

  it('does not flag an A4 canvas that only pads unscaled content', () => {
    const padded = pdfPageStretchMetrics({
      canvasWidth: 1021,
      canvasHeight: a4ContentCanvasHeightPx(1021, 190),
      sourceCanvasHeight: 285,
      captureHeightPx: 190,
      scale: 1.5,
      contentWidthMm: 190,
      paddedCanvas: true,
    })
    expect(padded.stretchPlacedOverNatural).toBeGreaterThan(4)
    expect(padded.stretchFlagged).toBe(false)
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
