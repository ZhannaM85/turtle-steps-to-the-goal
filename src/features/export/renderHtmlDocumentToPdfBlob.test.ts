import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canvasScaleForDimensions,
  capturePdfPageDataUrls,
  explodeOverflowingPdfPagesForTest,
  MAX_STYLED_PAGE_PX,
  shouldIgnorePdfRenderElement,
} from './renderHtmlDocumentToPdfBlob'
import {
  a4ContentCanvasHeightPx,
  pdfCaptureHeightThroughFooterPx,
  pdfFooterSourceFromCanvasBottom,
  pinPdfFooterToCanvasBottom,
  preparePdfPagesForCapture,
} from './pinPdfFooterToCanvas'

describe('explodeOverflowingPdfPages (#908)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('splits a tall pdf-page into multiple styled pages by body children', () => {
    // jsdom often reports scrollHeight as 0 — synthesize heights from inline styles.
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains('pdf-page')) {
          const body = this.querySelector('.pdf-page-body')
          let height = 40
          for (const child of body?.children ?? []) {
            const raw = (child as HTMLElement).style.height
            height += Number.parseInt(raw, 10) || 50
          }
          return height
        }
        return 0
      },
    )

    const host = document.createElement('div')
    host.innerHTML = `
      <div class="pdf-root">
        <section class="pdf-page">
          <div class="pdf-page-body pdf-summary-body">
            <div class="block" style="height:600px">a</div>
            <div class="block" style="height:600px">b</div>
            <div class="block" style="height:600px">c</div>
          </div>
          <footer class="pdf-footer"><p>foot</p><p class="pdf-page-number"></p></footer>
        </section>
      </div>
    `
    document.body.appendChild(host)
    try {
      explodeOverflowingPdfPagesForTest(host)
      const pages = host.querySelectorAll('.pdf-page')
      expect(pages.length).toBeGreaterThan(1)
      for (const [index, page] of [...pages].entries()) {
        expect(page.querySelector('.pdf-footer')).not.toBeNull()
        expect(page.querySelector('.pdf-page-number')?.textContent).toBe(
          `${index + 1}`,
        )
        expect(page.querySelector('.pdf-summary-body')).not.toBeNull()
        expect(
          page.querySelector('.pdf-page-body')?.children.length,
        ).toBeGreaterThan(0)
      }
      expect(host.textContent).toContain('a')
      expect(host.textContent).toContain('b')
      expect(host.textContent).toContain('c')
    } finally {
      host.remove()
    }
  })

  it('moves a card before a near-full page creates a blank image slice', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        if (!this.classList.contains('pdf-page')) return 0
        const body = this.querySelector('.pdf-page-body')
        let height = 40
        for (const child of body?.children ?? []) {
          height += Number.parseInt((child as HTMLElement).style.height, 10)
        }
        return height
      },
    )

    const host = document.createElement('div')
    host.innerHTML = `<div class="pdf-root"><section class="pdf-page">
      <div class="pdf-page-body">
        <section style="height:450px">Food</section>
        <section style="height:500px">Water</section>
      </div><footer class="pdf-footer">Disclaimer</footer>
    </section></div>`
    document.body.appendChild(host)
    try {
      explodeOverflowingPdfPagesForTest(host)
      const pages = [...host.querySelectorAll<HTMLElement>('.pdf-page')]
      expect(pages).toHaveLength(2)
      expect(pages[0]?.textContent).toContain('Food')
      expect(pages[1]?.textContent).toContain('Water')
      expect(pages.every((page) => page.scrollHeight <= 980)).toBe(true)
    } finally {
      host.remove()
    }
  })
})

describe('canvasScaleForDimensions (#922)', () => {
  it('uses a 1.5x canvas for a standard PDF page to speed up diary exports', () => {
    expect(canvasScaleForDimensions(794, 980)).toBe(1.5)
  })

  it('still reduces the scale for unusually tall content that approaches Safari canvas limits', () => {
    expect(canvasScaleForDimensions(794, 4000)).toBe(1)
  })
})

describe('shouldIgnorePdfRenderElement (#922)', () => {
  it('keeps only the document shell and PDF render host during canvas cloning', () => {
    const host = document.createElement('div')
    host.innerHTML = '<section><p>PDF page</p></section>'
    const liveApp = document.createElement('div')
    liveApp.innerHTML = '<dialog>Settings</dialog>'
    document.body.append(host, liveApp)

    try {
      expect(shouldIgnorePdfRenderElement(document.documentElement, host)).toBe(
        false,
      )
      expect(shouldIgnorePdfRenderElement(document.head, host)).toBe(false)
      expect(shouldIgnorePdfRenderElement(document.body, host)).toBe(false)
      expect(shouldIgnorePdfRenderElement(host, host)).toBe(false)
      expect(shouldIgnorePdfRenderElement(host.querySelector('p')!, host)).toBe(
        false,
      )
      expect(shouldIgnorePdfRenderElement(liveApp, host)).toBe(true)
      expect(
        shouldIgnorePdfRenderElement(liveApp.querySelector('dialog')!, host),
      ).toBe(true)

      const overlay = document.createElement('div')
      overlay.id = 'pdf-debug-overlay'
      const overlayBody = document.createElement('pre')
      overlay.appendChild(overlayBody)
      document.body.appendChild(overlay)
      expect(shouldIgnorePdfRenderElement(overlay, host)).toBe(true)
      expect(shouldIgnorePdfRenderElement(overlayBody, host)).toBe(true)
      overlay.remove()
    } finally {
      host.remove()
      liveApp.remove()
    }
  })
})

describe('capturePdfPageDataUrls (#935)', () => {
  it('returns a stub image in the test environment', async () => {
    const urls = await capturePdfPageDataUrls(
      '<html><body><div class="pdf-root"></div></body></html>',
    )
    expect(urls).toHaveLength(1)
    expect(urls[0]).toMatch(/^data:image\//)
  })
})

describe('preparePdfPagesForCapture (#958)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes a leftover fill strut and uses block packing, not flex min-height', () => {
    const host = document.createElement('div')
    host.innerHTML = `<div class="pdf-root"><section class="pdf-page" style="display:flex;height:980px;min-height:980px">
      <div class="pdf-page-body"><p>short day</p></div>
      <div class="pdf-page-fill" style="height:200px"></div>
      <footer class="pdf-footer">Disclaimer</footer>
    </section></div>`
    document.body.appendChild(host)
    try {
      preparePdfPagesForCapture(host)
      const page = host.querySelector<HTMLElement>('.pdf-page')
      const footer = page?.querySelector<HTMLElement>('.pdf-footer')
      expect(host.querySelector('.pdf-page-fill')).toBeNull()
      expect(page?.style.display).toBe('block')
      expect(page?.style.height).toBe('auto')
      expect(page?.style.minHeight).toBe('0px')
      expect(footer).not.toBeNull()
      expect(footer?.style.position).toBe('static')
      expect(page?.querySelector('.pdf-page-body')?.nextElementSibling).toBe(
        footer,
      )
    } finally {
      host.remove()
    }
  })

  it('does not insert a fill strut after a short leftover split page', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        if (!this.classList.contains('pdf-page')) return 0
        const body = this.querySelector('.pdf-page-body')
        let height = 40
        for (const child of body?.children ?? []) {
          height +=
            Number.parseInt((child as HTMLElement).style.height, 10) || 0
        }
        return height
      },
    )

    const host = document.createElement('div')
    host.innerHTML = `<div class="pdf-root"><section class="pdf-page">
      <div class="pdf-page-body">
        <section style="height:600px">Food</section>
        <section style="height:600px">Water</section>
      </div><footer class="pdf-footer"><p class="pdf-page-number"></p></footer>
    </section></div>`
    document.body.appendChild(host)
    try {
      explodeOverflowingPdfPagesForTest(host)
      preparePdfPagesForCapture(host)
      const pages = [...host.querySelectorAll<HTMLElement>('.pdf-page')]
      expect(pages).toHaveLength(2)
      expect(host.querySelector('.pdf-page-fill')).toBeNull()
      for (const page of pages) {
        expect(page.style.display).toBe('block')
        expect(page.style.height).toBe('auto')
        expect(page.querySelector('.pdf-footer')).not.toBeNull()
        expect(page.scrollHeight).toBeLessThan(MAX_STYLED_PAGE_PX)
      }
    } finally {
      host.remove()
    }
  })

  it('keeps Water rows and Notes header+body together when splitting a tall day', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        if (!this.classList.contains('pdf-page')) return 0
        const body = this.querySelector('.pdf-page-body')
        let height = 40
        for (const child of body?.children ?? []) {
          height +=
            Number.parseInt((child as HTMLElement).style.height, 10) || 50
        }
        return height
      },
    )

    const host = document.createElement('div')
    host.innerHTML = `<div class="pdf-root"><section class="pdf-page">
      <div class="pdf-page-body">
        <div class="pdf-day-start" style="height:500px">header + metrics</div>
        <section class="pdf-day-section pdf-day-section-water" style="height:500px">
          <h3 class="pdf-day-section-title">Water</h3>
          <div class="pdf-day-section-content">
            <p class="pdf-day-item">09:00 · 250 ml</p>
            <p class="pdf-day-item">12:00 · 250 ml</p>
            <p class="pdf-day-item">18:00 · 250 ml</p>
          </div>
        </section>
        <section class="pdf-day-section pdf-day-section-notes" style="height:500px">
          <h3 class="pdf-day-section-title">Notes</h3>
          <div class="pdf-day-section-content"><p class="pdf-line">walked after dinner</p></div>
        </section>
      </div><footer class="pdf-footer">Disclaimer · generated</footer>
    </section></div>`
    document.body.appendChild(host)
    try {
      explodeOverflowingPdfPagesForTest(host)
      preparePdfPagesForCapture(host)
      const pages = [...host.querySelectorAll<HTMLElement>('.pdf-page')]
      expect(pages.length).toBeGreaterThan(1)
      expect(host.querySelector('.pdf-page-fill')).toBeNull()

      const water = host.querySelector('.pdf-day-section-water')
      expect(water).not.toBeNull()
      expect(water?.querySelector('.pdf-day-section-title')?.textContent).toBe(
        'Water',
      )
      expect(water?.querySelectorAll('.pdf-day-item')).toHaveLength(3)
      expect(
        water?.closest('.pdf-page')?.querySelector('.pdf-footer'),
      ).not.toBeNull()

      const notes = host.querySelector('.pdf-day-section-notes')
      expect(notes).not.toBeNull()
      expect(notes?.querySelector('.pdf-day-section-title')?.textContent).toBe(
        'Notes',
      )
      expect(
        notes?.querySelector('.pdf-day-section-content')?.textContent,
      ).toContain('walked after dinner')
      expect(
        notes?.closest('.pdf-page')?.querySelector('.pdf-footer'),
      ).not.toBeNull()
    } finally {
      host.remove()
    }
  })
})

describe('pdfCaptureHeightThroughFooterPx (#958)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clips capture to the footer bottom, not padding below the footer', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.innerHTML =
      '<div class="pdf-page-body">body</div><footer class="pdf-footer">Disclaimer</footer>'
    document.body.appendChild(page)
    const footer = page.querySelector<HTMLElement>('.pdf-footer')!
    vi.spyOn(page, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      bottom: 420,
      left: 0,
      right: 100,
      width: 100,
      height: 420,
      toJSON() {
        return {}
      },
    })
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 360,
      top: 360,
      bottom: 400,
      left: 0,
      right: 100,
      width: 100,
      height: 40,
      toJSON() {
        return {}
      },
    })
    vi.spyOn(page, 'scrollHeight', 'get').mockReturnValue(420)
    vi.spyOn(page, 'offsetHeight', 'get').mockReturnValue(420)
    try {
      expect(pdfCaptureHeightThroughFooterPx(page)).toBe(400)
    } finally {
      page.remove()
    }
  })
})

describe('pinPdfFooterToCanvasBottom (#958)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pins the in-flow footer slice from the canvas bottom onto an A4-tall canvas', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.innerHTML =
      '<div class="pdf-page-body">body</div><footer class="pdf-footer">Disclaimer</footer>'
    document.body.appendChild(page)
    const footer = page.querySelector('.pdf-footer') as HTMLElement
    vi.spyOn(footer, 'offsetHeight', 'get').mockReturnValue(40)
    vi.spyOn(page, 'scrollHeight', 'get').mockReturnValue(400)
    vi.spyOn(page, 'offsetHeight', 'get').mockReturnValue(400)

    try {
      expect(pdfFooterSourceFromCanvasBottom(400, page, 400)).toEqual({
        y: 360,
        height: 40,
      })
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 400
      const ctx = {
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      }
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      )
      const dest = pinPdfFooterToCanvasBottom(canvas, page, 980, 400)
      expect(dest).not.toBe(canvas)
      expect(dest.width).toBe(100)
      expect(dest.height).toBe(980)
      expect(ctx.drawImage).toHaveBeenCalledWith(
        canvas,
        0,
        360,
        100,
        40,
        0,
        940,
        100,
        40,
      )
    } finally {
      page.remove()
    }
  })

  it('leaves a full-height capture unchanged', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.innerHTML = '<footer class="pdf-footer">Disclaimer</footer>'
    document.body.appendChild(page)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 980
      expect(pinPdfFooterToCanvasBottom(canvas, page, 980, 980)).toBe(canvas)
    } finally {
      page.remove()
    }
  })

  it('leaves a page without a footer unchanged', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.innerHTML = '<div class="pdf-page-body">body</div>'
    document.body.appendChild(page)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 400
      expect(pinPdfFooterToCanvasBottom(canvas, page, 980, 400)).toBe(canvas)
    } finally {
      page.remove()
    }
  })
})

describe('a4ContentCanvasHeightPx (#939)', () => {
  it('sizes the placed image for a ~10mm PDF bottom margin', () => {
    const heightPx = a4ContentCanvasHeightPx(1021, 190)
    const imgHeightMm = (heightPx * 190) / 1021
    expect(imgHeightMm).toBeGreaterThan(276)
    expect(imgHeightMm).toBeLessThanOrEqual(277)
    expect(297 - 10 - imgHeightMm).toBeGreaterThan(10)
    expect(297 - 10 - imgHeightMm).toBeLessThan(11)
  })
})
