/**
 * #905 / #908 — mount an off-DOM HTML document and convert it to a PDF Blob.
 * Uses html2canvas + jsPDF page-by-page (one canvas per `.pdf-page`) so iOS
 * Safari does not blank out from a single canvas larger than ~4096².
 *
 * #908 — before capture, split overflowing `.pdf-page` nodes so each PDF
 * sheet is a full styled HTML page (not a raw mid-canvas JPEG band that
 * drops section-card chrome after page 2).
 *
 * #935 — the layout preview uses the same html2canvas pass as the download.
 *
 * #939 — when `?pdfDebug=1` or localStorage `pdfDebug=1`, log layout/capture
 * numbers to the console and a phone-readable overlay. Debug only; no extra
 * capture-height CSS change.
 */
import {
  applyPdfDebugOutlines,
  collectPdfPageLayoutSnapshot,
  isPdfDebugEnabled,
  isPdfDebugOverlayElement,
  persistPdfDebugFlagFromLocation,
  publishPdfDebugReport,
  type PdfPageLayoutSnapshot,
} from './pdfDebug'

const TEST_PREVIEW_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

function isPdfRenderTestEnv(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    typeof document === 'undefined' ||
    !document.body
  )
}

export async function renderHtmlDocumentToPdfBlob(
  html: string,
): Promise<Blob> {
  // Vitest/jsdom has no usable canvas layout — return a minimal PDF so
  // callers can still assert a Blob without pulling in Playwright here.
  if (isPdfRenderTestEnv()) {
    return new Blob(['%PDF-1.4\n%html2pdf-stub\n'], {
      type: 'application/pdf',
    })
  }

  const painted = await paintPdfPages(html)
  try {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageWidthMm = pdf.internal.pageSize.getWidth()
    const pageHeightMm = pdf.internal.pageSize.getHeight()
    const marginMm = 10
    const contentWidthMm = pageWidthMm - marginMm * 2

    for (let i = 0; i < painted.canvases.length; i++) {
      const canvas = painted.canvases[i]!
      const imgHeightMm = (canvas.height * contentWidthMm) / canvas.width
      if (i > 0) pdf.addPage()

      // Prefer one image per styled page. Band-slice only if a single
      // unsplitable node is still taller than A4 (last resort).
      if (imgHeightMm <= pageHeightMm - marginMm * 2 + 0.5) {
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          marginMm,
          marginMm,
          contentWidthMm,
          imgHeightMm,
        )
        continue
      }

      let drawnMm = 0
      let slicePx = 0
      const pxPerMm = canvas.height / imgHeightMm
      while (drawnMm < imgHeightMm - 0.1) {
        const bandMm = Math.min(
          pageHeightMm - marginMm * 2,
          imgHeightMm - drawnMm,
        )
        const bandPx = Math.max(1, Math.round(bandMm * pxPerMm))
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = bandPx
        const ctx = sliceCanvas.getContext('2d')
        if (!ctx) throw new Error('2d canvas context unavailable')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(
          canvas,
          0,
          slicePx,
          canvas.width,
          bandPx,
          0,
          0,
          canvas.width,
          bandPx,
        )
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92)
        if (drawnMm > 0) pdf.addPage()
        pdf.addImage(
          sliceData,
          'JPEG',
          marginMm,
          marginMm,
          contentWidthMm,
          bandMm,
        )
        drawnMm += bandMm
        slicePx += bandPx
      }
    }

    const blob = pdf.output('blob')
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('PDF render produced an empty blob')
    }
    return blob.type
      ? blob
      : new Blob([await blob.arrayBuffer()], { type: 'application/pdf' })
  } finally {
    painted.cleanup()
  }
}

/** #935 — JPEG data URLs from the same html2canvas pages the PDF file uses. */
export async function capturePdfPageDataUrls(html: string): Promise<string[]> {
  if (isPdfRenderTestEnv()) return [TEST_PREVIEW_IMAGE]
  const painted = await paintPdfPages(html)
  try {
    return painted.canvases.map((canvas) =>
      canvas.toDataURL('image/jpeg', 0.92),
    )
  } finally {
    painted.cleanup()
  }
}

async function paintPdfPages(html: string): Promise<{
  canvases: HTMLCanvasElement[]
  cleanup: () => void
}> {
  const { styleCss, bodyHtml } = splitHtmlDocument(html)
  const host = document.createElement('div')
  host.setAttribute('data-pdf-render-root', 'true')
  // On-screen but invisible — off-left mounts often produce blank canvases
  // on iOS Safari (html2canvas).
  host.style.position = 'fixed'
  host.style.left = '0'
  host.style.top = '0'
  host.style.width = '794px' // ~A4 @ 96dpi
  host.style.opacity = '0'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'
  host.style.background = '#fff'
  host.innerHTML = `<style>${styleCss}</style>${bodyHtml}`
  document.body.appendChild(host)

  const scrollX = window.scrollX
  const scrollY = window.scrollY
  window.scrollTo(0, 0)

  const cleanup = () => {
    host.remove()
    window.scrollTo(scrollX, scrollY)
  }

  try {
    persistPdfDebugFlagFromLocation()
    const debug = isPdfDebugEnabled()
    const debugSnapshots: PdfPageLayoutSnapshot[] = []

    void host.offsetHeight
    explodeOverflowingPdfPages(host)

    const pages = [...host.querySelectorAll<HTMLElement>('.pdf-page')]
    const targets =
      pages.length > 0
        ? pages
        : [host.querySelector<HTMLElement>('.pdf-root') ?? host]

    if (debug) {
      targets.forEach((page, index) => {
        debugSnapshots.push(
          collectPdfPageLayoutSnapshot(page, index, 'beforeFill'),
        )
      })
    }

    // After split: in-flow pixel fill. CSS min-height + flex footer pinning
    // are ignored by html2canvas on iOS WebKit, so scrollHeight stays
    // content-sized and the PDF shows a blank band below the footer (#939).
    fillPdfPagesToCaptureHeight(host)
    void host.offsetHeight

    if (debug) {
      applyPdfDebugOutlines(host)
      targets.forEach((page, index) => {
        debugSnapshots.push(
          collectPdfPageLayoutSnapshot(page, index, 'beforeCapture'),
        )
      })
    }

    const { default: html2canvas } = await import('html2canvas')
    const canvases: HTMLCanvasElement[] = []
    const contentWidthMm = 190
    for (const [index, target] of targets.entries()) {
      const scale = canvasScaleForElement(target)
      const captureHeightPx = pdfCaptureHeightPx(target)
      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (element) =>
          shouldIgnorePdfRenderElement(element, host),
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement
            .querySelectorAll<HTMLElement>(
              '.pdf-day-header, .pdf-day-header h2, .pdf-day-section-title, .pdf-table th, .pdf-table td',
            )
            .forEach((el) => {
              el.style.lineHeight = '1'
            })
          if (target.style.height) {
            clonedElement.style.height = target.style.height
            clonedElement.style.minHeight = target.style.minHeight
          }
        },
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(target.scrollWidth, host.clientWidth),
        windowHeight: captureHeightPx,
        height: captureHeightPx,
      })
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('html2canvas produced an empty canvas')
      }
      canvases.push(canvas)
      if (debug) {
        const after = collectPdfPageLayoutSnapshot(target, index, 'afterCapture')
        after.canvasWidth = canvas.width
        after.canvasHeight = canvas.height
        after.captureHeightPx = captureHeightPx
        after.scale = scale
        after.imgHeightMm = (canvas.height * contentWidthMm) / canvas.width
        debugSnapshots.push(after)
      }
    }

    if (debug) {
      try {
        publishPdfDebugReport({
          maxStyledPagePx: MAX_STYLED_PAGE_PX,
          a4FillTargetPx: MAX_STYLED_PAGE_PX,
          hostWidthPx: host.offsetWidth || 794,
          marginMm: 10,
          contentWidthMm,
          pageHeightMm: 297,
          userAgent:
            typeof navigator === 'undefined' ? '' : navigator.userAgent,
          viewport:
            typeof window === 'undefined'
              ? ''
              : `${window.innerWidth}x${window.innerHeight}`,
          devicePixelRatio:
            typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
          pages: debugSnapshots,
        })
      } catch (error) {
        console.warn('[pdfDebug #939] overlay failed', error)
      }
    }

    return { canvases, cleanup }
  } catch (error) {
    cleanup()
    throw error
  }
}

function splitHtmlDocument(html: string): { styleCss: string; bodyHtml: string } {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const styleCss = styleMatch?.[1] ?? ''
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch?.[1] ?? html
  return { styleCss, bodyHtml }
}

/** Keep the document shell and the isolated PDF host when html2canvas clones. */
export function shouldIgnorePdfRenderElement(
  element: Element,
  host: HTMLElement,
): boolean {
  if (isPdfDebugOverlayElement(element)) return true
  const { documentElement, head, body } = element.ownerDocument
  return (
    element !== documentElement &&
    element !== head &&
    element !== body &&
    element !== host &&
    !host.contains(element)
  )
}

/** Keep canvas under iOS Safari’s ~4096² limit (html2canvas blank-page bug). */
function canvasScaleForElement(el: HTMLElement): number {
  return canvasScaleForDimensions(el.scrollWidth, el.scrollHeight)
}

/**
 * #922 — 1.5x gives a crisp ~144dpi PDF image while reducing each canvas
 * from about 3.1 to 1.8 million pixels for a standard diary sheet. Rendering
 * several weekly pages becomes substantially faster without sacrificing
 * readable text or card borders.
 */
export function canvasScaleForDimensions(width: number, height: number): number {
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  const maxEdge = 4096
  const maxScale = Math.min(maxEdge / w, maxEdge / h, 1.5)
  return Math.max(1, Math.floor(maxScale * 10) / 10)
}

/**
 * #918 — a `.pdf-page` is 180mm wide, then its image is scaled to the PDF's
 * 190mm printable width. The 277mm printable height therefore fits at most
 * 277 * 180 / 190 mm of source height (about 992px at 96dpi). Leave a small
 * buffer for canvas rounding so a few blank pixels never become another PDF
 * sheet in the fallback image slicer.
 */
export const MAX_STYLED_PAGE_PX = 980

const PDF_PAGE_FILL_CLASS = 'pdf-page-fill'

function pdfCaptureHeightPx(target: HTMLElement): number {
  const pinned = Number.parseInt(target.style.height, 10)
  return Math.max(
    target.scrollHeight,
    target.offsetHeight,
    Number.isFinite(pinned) ? pinned : 0,
    1,
  )
}

/**
 * #939 — html2canvas (iOS WebKit especially) ignores CSS min-height and flex
 * `margin-top: auto`, so the captured page stays content-tall (~248 mm) and
 * the PDF shows a large blank band below the footer. Insert an in-flow pixel
 * strut after splitting, without exceeding the 980 px one-page cap.
 */
function fillPdfPagesToCaptureHeight(host: HTMLElement): void {
  for (const page of host.querySelectorAll<HTMLElement>('.pdf-page')) {
    fillPdfPageToCaptureHeight(page)
  }
}

function measurePdfPageContentHeightPx(page: HTMLElement): number {
  const prevHeight = page.style.height
  const prevMinHeight = page.style.minHeight
  page.style.height = 'auto'
  page.style.minHeight = '0px'
  void page.offsetHeight
  const height = page.scrollHeight
  page.style.height = prevHeight
  page.style.minHeight = prevMinHeight
  return height
}

function fillPdfPageToCaptureHeight(page: HTMLElement): void {
  if (page.querySelector(`.${PDF_PAGE_FILL_CLASS}`)) return

  const contentHeight = measurePdfPageContentHeightPx(page)
  if (contentHeight >= MAX_STYLED_PAGE_PX) return

  const gapPx = MAX_STYLED_PAGE_PX - contentHeight
  const spacer = page.ownerDocument.createElement('div')
  spacer.className = PDF_PAGE_FILL_CLASS
  spacer.setAttribute('aria-hidden', 'true')
  spacer.style.height = `${gapPx}px`
  spacer.style.minHeight = `${gapPx}px`
  spacer.style.flexGrow = '0'
  spacer.style.flexShrink = '0'
  spacer.style.flexBasis = `${gapPx}px`

  // Real in-flow box: empty flex spacers collapse in html2canvas.
  const strut = page.ownerDocument.createElement('div')
  strut.style.height = `${gapPx}px`
  strut.style.width = '1px'
  spacer.appendChild(strut)

  const body = page.querySelector<HTMLElement>('.pdf-page-body')
  if (body) {
    body.style.flexGrow = '0'
    body.style.flexShrink = '0'
    body.style.flexBasis = 'auto'
  }

  const footer = page.querySelector('.pdf-footer')
  if (footer instanceof HTMLElement) {
    footer.style.marginTop = '0'
    page.insertBefore(spacer, footer)
  } else {
    page.appendChild(spacer)
  }

  page.style.height = `${MAX_STYLED_PAGE_PX}px`
  page.style.minHeight = `${MAX_STYLED_PAGE_PX}px`
}

function explodeOverflowingPdfPages(host: HTMLElement): void {
  const root = host.querySelector('.pdf-root')
  if (!root) return

  for (const page of [
    ...root.querySelectorAll<HTMLElement>(':scope > .pdf-page'),
  ]) {
    if (page.scrollHeight <= MAX_STYLED_PAGE_PX) continue

    const body = page.querySelector<HTMLElement>('.pdf-page-body')
    if (!body) continue
    const bodyClassName = body.className
    const kids = [...body.children] as HTMLElement[]
    if (kids.length < 2) continue

    const footer = page.querySelector('.pdf-footer')
    const footerHtml = footer?.outerHTML ?? ''
    const insertBefore = page.nextSibling

    // Detach original; rebuild as one or more fitting pages.
    page.remove()

    let current = makeEmptyPdfPage(footerHtml, bodyClassName)
    let currentBody = current.querySelector<HTMLElement>('.pdf-page-body')!
    root.insertBefore(current, insertBefore)

    for (const kid of kids) {
      currentBody.appendChild(kid)
      if (
        current.scrollHeight > MAX_STYLED_PAGE_PX &&
        currentBody.children.length > 1
      ) {
        const overflow = currentBody.lastElementChild!
        overflow.remove()
        current = makeEmptyPdfPage(footerHtml, bodyClassName)
        currentBody = current.querySelector<HTMLElement>('.pdf-page-body')!
        currentBody.appendChild(overflow)
        root.insertBefore(current, insertBefore)
      }
    }
  }

  const pages = [
    ...root.querySelectorAll<HTMLElement>(':scope > .pdf-page'),
  ]
  pages.forEach((page, index) => {
    const pageNumber = page.querySelector<HTMLElement>('.pdf-page-number')
    if (pageNumber) pageNumber.textContent = `${index + 1}`
  })
}

function makeEmptyPdfPage(footerHtml: string, bodyClassName: string): HTMLElement {
  const page = document.createElement('section')
  page.className = 'pdf-page'
  page.innerHTML = `<div class="${bodyClassName}"></div>${footerHtml}`
  return page
}

/** Exported for unit tests (#908 packing). */
export function explodeOverflowingPdfPagesForTest(host: HTMLElement): void {
  explodeOverflowingPdfPages(host)
}

/** Exported for unit tests (#939 capture-height fill). */
export function fillPdfPagesToCaptureHeightForTest(host: HTMLElement): void {
  fillPdfPagesToCaptureHeight(host)
}
