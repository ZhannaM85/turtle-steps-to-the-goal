import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canvasScaleForDimensions,
  explodeOverflowingPdfPagesForTest,
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
          <footer class="pdf-footer"><p>foot</p></footer>
        </section>
      </div>
    `
    document.body.appendChild(host)
    try {
      explodeOverflowingPdfPagesForTest(host)
      const pages = host.querySelectorAll('.pdf-page')
      expect(pages.length).toBeGreaterThan(1)
      for (const page of pages) {
        expect(page.querySelector('.pdf-footer')).not.toBeNull()
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
