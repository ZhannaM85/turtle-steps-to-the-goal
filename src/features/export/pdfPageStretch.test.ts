import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  a4ContentCanvasHeightPx,
  packPdfPageElement,
  pdfImageHeightMm,
  pinPdfFooterToCanvasBottom,
} from './pinPdfFooterToCanvas'

describe('pinPdfFooterToCanvasBottom (#960)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pins the footer on A4 paper without scaling body or footer pixels', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1021
    canvas.height = 225
    const footerCanvas = document.createElement('canvas')
    footerCanvas.width = 1021
    footerCanvas.height = 60
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    const destHeight = a4ContentCanvasHeightPx(canvas.width, 190)
    const dest = pinPdfFooterToCanvasBottom(
      canvas,
      footerCanvas,
      destHeight,
    )
    expect(dest).not.toBe(canvas)
    expect(dest.height).toBe(destHeight)
    expect(drawImage).toHaveBeenNthCalledWith(
      1,
      canvas,
      0,
      0,
    )
    expect(drawImage).toHaveBeenNthCalledWith(
      2,
      footerCanvas,
      0,
      destHeight - 60,
    )
    const placedMm = pdfImageHeightMm(dest.width, dest.height, 190)
    expect(placedMm).toBeGreaterThan(276)
    expect(297 - 10 - placedMm).toBeGreaterThan(10)
  })

  it('leaves the body unchanged when the footer capture is empty', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 980
    const footerCanvas = document.createElement('canvas')
    footerCanvas.height = 0
    expect(pinPdfFooterToCanvasBottom(canvas, footerCanvas, 980)).toBe(canvas)
    expect(canvas.height).toBe(980)
  })

  it('keeps every body pixel when body and footer exceed the A4 target', () => {
    const body = document.createElement('canvas')
    body.width = 100
    body.height = 1000
    const footer = document.createElement('canvas')
    footer.width = 100
    footer.height = 100
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    const result = pinPdfFooterToCanvasBottom(body, footer, 980)
    expect(result.height).toBe(1100)
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
  it('sizes the A4 canvas for a ~10mm PDF bottom margin', () => {
    const heightPx = a4ContentCanvasHeightPx(1021, 190)
    const imgHeightMm = (heightPx * 190) / 1021
    expect(imgHeightMm).toBeGreaterThan(276)
    expect(imgHeightMm).toBeLessThanOrEqual(277)
    expect(297 - 10 - imgHeightMm).toBeGreaterThan(10)
    expect(297 - 10 - imgHeightMm).toBeLessThan(11)
  })
})
