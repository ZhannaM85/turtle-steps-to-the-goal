import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canvasScaleForDimensions,
  capturePdfPageDataUrls,
  explodeOverflowingPdfPagesForTest,
  fillPdfPagesToCaptureHeightForTest,
  MAX_STYLED_PAGE_PX,
  shouldIgnorePdfRenderElement,
} from './renderHtmlDocumentToPdfBlob'

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
      expect(shouldIgnorePdfRenderElement(document.documentElement, host)).toBe(false)
      expect(shouldIgnorePdfRenderElement(document.head, host)).toBe(false)
      expect(shouldIgnorePdfRenderElement(document.body, host)).toBe(false)
      expect(shouldIgnorePdfRenderElement(host, host)).toBe(false)
      expect(shouldIgnorePdfRenderElement(host.querySelector('p')!, host)).toBe(false)
      expect(shouldIgnorePdfRenderElement(liveApp, host)).toBe(true)
      expect(shouldIgnorePdfRenderElement(liveApp.querySelector('dialog')!, host)).toBe(true)
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

describe('fillPdfPagesToCaptureHeight (#939)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('inserts a pixel strut so html2canvas can honor the 980px capture floor', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        if (!this.classList.contains('pdf-page')) return 0
        const fill = this.querySelector('.pdf-page-fill') as HTMLElement | null
        const fillPx = fill ? Number.parseInt(fill.style.height, 10) || 0 : 0
        return 400 + fillPx
      },
    )

    const host = document.createElement('div')
    host.innerHTML = `<div class="pdf-root"><section class="pdf-page">
      <div class="pdf-page-body"><p>short day</p></div>
      <footer class="pdf-footer">Disclaimer</footer>
    </section></div>`
    document.body.appendChild(host)
    try {
      fillPdfPagesToCaptureHeightForTest(host)
      const page = host.querySelector<HTMLElement>('.pdf-page')
      const fill = page?.querySelector<HTMLElement>('.pdf-page-fill')
      const footer = page?.querySelector('.pdf-footer')
      expect(fill).not.toBeNull()
      expect(fill?.style.height).toBe(`${MAX_STYLED_PAGE_PX - 400}px`)
      expect(page?.style.height).toBe(`${MAX_STYLED_PAGE_PX}px`)
      expect(page?.style.minHeight).toBe(`${MAX_STYLED_PAGE_PX}px`)
      expect(fill?.nextElementSibling).toBe(footer)
      expect(fill?.querySelector('div')?.style.height).toBe(
        `${MAX_STYLED_PAGE_PX - 400}px`,
      )
    } finally {
      host.remove()
    }
  })

  it('does not add a fill strut when the page already meets the capture height', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('pdf-page') ? MAX_STYLED_PAGE_PX : 0
      },
    )

    const host = document.createElement('div')
    host.innerHTML = `<div class="pdf-root"><section class="pdf-page">
      <div class="pdf-page-body"><section style="height:980px">full</section></div>
      <footer class="pdf-footer">Disclaimer</footer>
    </section></div>`
    document.body.appendChild(host)
    try {
      fillPdfPagesToCaptureHeightForTest(host)
      expect(host.querySelector('.pdf-page-fill')).toBeNull()
      expect(host.querySelector<HTMLElement>('.pdf-page')?.style.height).toBe('')
    } finally {
      host.remove()
    }
  })

  it('fills short leftover pages after a split without exceeding the cap', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        if (!this.classList.contains('pdf-page')) return 0
        const body = this.querySelector('.pdf-page-body')
        let height = 40
        for (const child of body?.children ?? []) {
          height += Number.parseInt((child as HTMLElement).style.height, 10) || 0
        }
        const fill = this.querySelector('.pdf-page-fill') as HTMLElement | null
        if (fill) height += Number.parseInt(fill.style.height, 10) || 0
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
      fillPdfPagesToCaptureHeightForTest(host)
      const pages = [...host.querySelectorAll<HTMLElement>('.pdf-page')]
      expect(pages).toHaveLength(2)
      for (const page of pages) {
        const fill = page.querySelector<HTMLElement>('.pdf-page-fill')
        expect(fill).not.toBeNull()
        const fillPx = Number.parseInt(fill?.style.height ?? '', 10)
        expect(fillPx).toBeGreaterThan(0)
        expect(page.scrollHeight).toBe(MAX_STYLED_PAGE_PX)
        expect(page.style.height).toBe(`${MAX_STYLED_PAGE_PX}px`)
      }
    } finally {
      host.remove()
    }
  })
})
