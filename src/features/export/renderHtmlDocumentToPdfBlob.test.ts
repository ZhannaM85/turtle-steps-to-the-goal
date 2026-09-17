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

describe('preparePdfPagesForCapture (#939)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes a leftover fill strut and unpins forced 980px height', () => {
    const host = document.createElement('div')
    host.innerHTML = `<div class="pdf-root"><section class="pdf-page" style="height:980px;min-height:980px">
      <div class="pdf-page-body"><p>short day</p></div>
      <div class="pdf-page-fill" style="height:200px"></div>
      <footer class="pdf-footer">Disclaimer</footer>
    </section></div>`
    document.body.appendChild(host)
    try {
      preparePdfPagesForCapture(host)
      const page = host.querySelector<HTMLElement>('.pdf-page')
      expect(host.querySelector('.pdf-page-fill')).toBeNull()
      expect(page?.style.height).toBe('auto')
      expect(page?.style.minHeight).toBe('0px')
      expect(page?.querySelector('.pdf-footer')).not.toBeNull()
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
        expect(page.style.height).toBe('auto')
        expect(page.scrollHeight).toBeLessThan(MAX_STYLED_PAGE_PX)
      }
    } finally {
      host.remove()
    }
  })
})

describe('pinPdfFooterToCanvasBottom (#939)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function rect(top: number, height: number, width = 100): DOMRect {
    return {
      x: 0,
      y: top,
      top,
      bottom: top + height,
      left: 0,
      right: width,
      width,
      height,
      toJSON() {
        return {}
      },
    }
  }

  it('pins the footer slice to the bottom of an A4-tall canvas', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.innerHTML =
      '<div class="pdf-page-body">body</div><footer class="pdf-footer">Disclaimer</footer>'
    document.body.appendChild(page)
    const footer = page.querySelector('.pdf-footer')!
    vi.spyOn(page, 'getBoundingClientRect').mockReturnValue(rect(0, 400))
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(rect(360, 40))
    vi.spyOn(page, 'scrollHeight', 'get').mockReturnValue(400)
    vi.spyOn(page, 'offsetHeight', 'get').mockReturnValue(400)
    Object.defineProperty(footer, 'offsetTop', {
      configurable: true,
      value: 360,
    })

    try {
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
      const dest = pinPdfFooterToCanvasBottom(canvas, page, 980)
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
      expect(pinPdfFooterToCanvasBottom(canvas, page, 980)).toBe(canvas)
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
      expect(pinPdfFooterToCanvasBottom(canvas, page, 980)).toBe(canvas)
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
