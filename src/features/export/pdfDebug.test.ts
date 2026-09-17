import { afterEach, describe, expect, it } from 'vitest'
import {
  collectPdfPageLayoutSnapshot,
  formatPdfDebugReport,
  isPdfDebugEnabled,
  persistPdfDebugFlagFromLocation,
  setPdfDebugEnabled,
  type PdfDebugReport,
} from './pdfDebug'

function memoryStorage(initial?: Record<string, string>) {
  const data = new Map<string, string>(Object.entries(initial ?? {}))
  return {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    data,
  }
}

describe('isPdfDebugEnabled (#939)', () => {
  it('enables from ?pdfDebug=1', () => {
    expect(
      isPdfDebugEnabled({ search: '?pdfDebug=1', storage: memoryStorage() }),
    ).toBe(true)
  })

  it('enables from pdfDebug=true and from a hash query', () => {
    expect(
      isPdfDebugEnabled({ search: 'pdfDebug=true', storage: memoryStorage() }),
    ).toBe(true)
    expect(
      isPdfDebugEnabled({
        search: '',
        hash: '#/settings/pdf-layout?pdfDebug=1',
        storage: memoryStorage(),
      }),
    ).toBe(true)
  })

  it('enables from localStorage when the URL has no flag', () => {
    expect(
      isPdfDebugEnabled({
        search: '',
        hash: '',
        storage: memoryStorage({ pdfDebug: '1' }),
      }),
    ).toBe(true)
  })

  it('stays off when neither URL nor storage is set', () => {
    expect(
      isPdfDebugEnabled({ search: '', hash: '', storage: memoryStorage() }),
    ).toBe(false)
    expect(
      isPdfDebugEnabled({
        search: '?pdfDebug=0',
        storage: memoryStorage({ pdfDebug: '1' }),
      }),
    ).toBe(false)
  })

  it('does not treat an unrelated query as enabled', () => {
    expect(
      isPdfDebugEnabled({
        search: '?foo=1',
        storage: memoryStorage({ other: '1' }),
      }),
    ).toBe(false)
  })
})

describe('persistPdfDebugFlagFromLocation (#939)', () => {
  it('stores pdfDebug=1 from the query so later navigations stay enabled', () => {
    const storage = memoryStorage()
    persistPdfDebugFlagFromLocation({ search: '?pdfDebug=1', storage })
    expect(storage.getItem('pdfDebug')).toBe('1')
    expect(isPdfDebugEnabled({ search: '', storage })).toBe(true)
  })

  it('clears storage when the query is pdfDebug=0', () => {
    const storage = memoryStorage({ pdfDebug: '1' })
    persistPdfDebugFlagFromLocation({ search: '?pdfDebug=0', storage })
    expect(storage.getItem('pdfDebug')).toBeNull()
    expect(isPdfDebugEnabled({ search: '', storage })).toBe(false)
  })
})

describe('setPdfDebugEnabled (#952)', () => {
  it('writes pdfDebug=1 so isPdfDebugEnabled is true without a query', () => {
    const storage = memoryStorage()
    setPdfDebugEnabled(true, { search: '', hash: '', storage })
    expect(storage.getItem('pdfDebug')).toBe('1')
    expect(isPdfDebugEnabled({ search: '', hash: '', storage })).toBe(true)
  })

  it('removes the stored flag so isPdfDebugEnabled is false', () => {
    const storage = memoryStorage({ pdfDebug: '1' })
    setPdfDebugEnabled(false, { search: '', hash: '', storage })
    expect(storage.getItem('pdfDebug')).toBeNull()
    expect(isPdfDebugEnabled({ search: '', hash: '', storage })).toBe(false)
  })
})

describe('collectPdfPageLayoutSnapshot / formatPdfDebugReport (#939)', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('records page, fill, and footer heights', () => {
    const page = document.createElement('section')
    page.className = 'pdf-page'
    page.style.height = '980px'
    page.style.minHeight = '980px'
    page.innerHTML = `
      <div class="pdf-page-body">body</div>
      <div class="pdf-page-fill" style="height:200px;min-height:200px"></div>
      <footer class="pdf-footer">foot</footer>
    `
    document.body.appendChild(page)

    const snap = collectPdfPageLayoutSnapshot(page, 0, 'beforeCapture')
    expect(snap.fillExists).toBe(true)
    expect(snap.fillHeight).toBe('200px')
    expect(snap.footerExists).toBe(true)
    expect(snap.inlineHeight).toBe('980px')
    expect(snap.inlineMinHeight).toBe('980px')
    expect(snap.fillOffsetTop).not.toBeUndefined()
    expect(snap.footerOffsetTop).not.toBeUndefined()
  })

  it('includes capture constants and canvas size in the overlay text', () => {
    const report: PdfDebugReport = {
      maxStyledPagePx: 980,
      a4FillTargetPx: 980,
      hostWidthPx: 794,
      marginMm: 10,
      contentWidthMm: 190,
      pageHeightMm: 297,
      userAgent: 'iPhone',
      viewport: '390x844',
      devicePixelRatio: 3,
      pages: [
        {
          index: 0,
          phase: 'beforeCapture',
          className: 'pdf-page',
          offsetHeight: 980,
          scrollHeight: 980,
          clientHeight: 980,
          computedHeight: '980px',
          computedMinHeight: '980px',
          inlineHeight: '980px',
          inlineMinHeight: '980px',
          overflow: 'visible',
          overflowX: 'visible',
          overflowY: 'visible',
          clip: 'auto',
          clipPath: 'none',
          contain: 'none',
          fillExists: true,
          fillHeight: '200px',
          fillMinHeight: '200px',
          fillOffsetHeight: 200,
          fillScrollHeight: 200,
          fillComputedHeight: '200px',
          fillOffsetTop: 740,
          footerExists: true,
          footerOffsetHeight: 40,
          footerOffsetTop: 700,
        },
        {
          index: 0,
          phase: 'afterCapture',
          className: 'pdf-page',
          offsetHeight: 980,
          scrollHeight: 980,
          clientHeight: 980,
          computedHeight: '980px',
          computedMinHeight: '980px',
          inlineHeight: '980px',
          inlineMinHeight: '980px',
          overflow: 'visible',
          overflowX: 'visible',
          overflowY: 'visible',
          clip: 'auto',
          clipPath: 'none',
          contain: 'none',
          fillExists: true,
          fillHeight: '200px',
          fillMinHeight: '200px',
          fillOffsetHeight: 200,
          fillScrollHeight: 200,
          fillComputedHeight: '200px',
          fillOffsetTop: 740,
          footerExists: true,
          footerOffsetHeight: 40,
          footerOffsetTop: 700,
          canvasWidth: 1021,
          canvasHeight: 285,
          captureHeightPx: 190,
          scale: 1.5,
          imgHeightMm: 53.0,
          naturalImgHeightMm: 53.0,
          stretchPlacedOverNatural: 1,
          stretchCanvasOverCapture: 1.5,
          stretchCanvasOverCaptureScaled: 1,
          stretchFlagged: false,
          sourceCanvasHeight: 285,
          pinnedFooter: false,
        },
      ],
    }

    const text = formatPdfDebugReport(report)
    expect(text).toContain('MAX_STYLED_PAGE_PX: 980')
    expect(text).toContain('A4 fill target used: 980px')
    expect(text).toContain('.pdf-page-fill: yes')
    expect(text).toContain('.pdf-page-fill vs footer: BELOW footer')
    expect(text).toContain('canvas: 1021 x 285')
    expect(text).toContain('pinnedFooter=no')
    expect(text).toContain('placed image height:')
    expect(text).toContain('natural 53.0mm')
    expect(text).toContain('stretch placed/natural: 1.00')
    expect(text).toContain('stretch canvas/(capture×scale): 1.00')
    expect(text).toContain('stretch flag: ok (~1)')
  })

  it('flags stretch when placed height is full A4 and capture is short (#960)', () => {
    const report: PdfDebugReport = {
      maxStyledPagePx: 980,
      a4FillTargetPx: 980,
      hostWidthPx: 794,
      marginMm: 10,
      contentWidthMm: 190,
      pageHeightMm: 297,
      userAgent: 'iPhone',
      viewport: '390x844',
      devicePixelRatio: 3,
      pages: [
        {
          index: 0,
          phase: 'afterCapture',
          className: 'pdf-page',
          offsetHeight: 190,
          scrollHeight: 190,
          clientHeight: 190,
          computedHeight: 'auto',
          computedMinHeight: '0px',
          inlineHeight: 'auto',
          inlineMinHeight: '0px',
          overflow: 'visible',
          overflowX: 'visible',
          overflowY: 'visible',
          clip: 'auto',
          clipPath: 'none',
          contain: 'none',
          fillExists: false,
          fillHeight: null,
          fillMinHeight: null,
          fillOffsetHeight: null,
          fillScrollHeight: null,
          fillComputedHeight: null,
          footerExists: true,
          footerOffsetHeight: 40,
          footerOffsetTop: 150,
          canvasWidth: 1021,
          canvasHeight: 1487,
          captureHeightPx: 190,
          scale: 1.5,
          imgHeightMm: 276.7,
          naturalImgHeightMm: 53.0,
          stretchPlacedOverNatural: 5.22,
          stretchCanvasOverCapture: 7.83,
          stretchCanvasOverCaptureScaled: 5.22,
          stretchFlagged: true,
          sourceCanvasHeight: 285,
          pinnedFooter: true,
          footerCanvasWidth: 1021,
          footerCanvasHeight: 60,
          bodyCanvasHeight: 225,
          compositeGapHeight: 1202,
          footerCompositeSafe: true,
        },
      ],
    }
    const text = formatPdfDebugReport(report)
    expect(text).toContain('stretch placed/natural: 5.22')
    expect(text).toContain('FLAG STRETCHED')
    expect(text).toContain('.pdf-page-fill: NO')
    expect(text).toContain('separate footer canvas: 1021 x 60px')
    expect(text).toContain('body canvas: 225px, inserted gap: 1202px')
    expect(text).toContain('footer composite: safe')
  })
})
