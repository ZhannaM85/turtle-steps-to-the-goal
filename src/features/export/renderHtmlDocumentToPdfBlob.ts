/**
 * #905 / #908 — mount an off-DOM HTML document and convert it to a PDF Blob.
 * Uses html2canvas + jsPDF page-by-page (one canvas per `.pdf-page`) so iOS
 * Safari does not blank out from a single canvas larger than ~4096².
 *
 * #908 — before capture, split overflowing `.pdf-page` nodes so each PDF
 * sheet is a full styled HTML page (not a raw mid-canvas JPEG band that
 * drops section-card chrome after page 2).
 */
export async function renderHtmlDocumentToPdfBlob(
  html: string,
): Promise<Blob> {
  // Vitest/jsdom has no usable canvas layout — return a minimal PDF so
  // callers can still assert a Blob without pulling in Playwright here.
  if (
    import.meta.env.MODE === 'test' ||
    typeof document === 'undefined' ||
    !document.body
  ) {
    return new Blob(['%PDF-1.4\n%html2pdf-stub\n'], {
      type: 'application/pdf',
    })
  }

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

  try {
    // Let layout settle, then pack tall pages into multiple styled pages.
    void host.offsetHeight
    explodeOverflowingPdfPages(host)

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const pages = [
      ...host.querySelectorAll<HTMLElement>('.pdf-page'),
    ]
    const targets =
      pages.length > 0
        ? pages
        : [host.querySelector<HTMLElement>('.pdf-root') ?? host]

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageWidthMm = pdf.internal.pageSize.getWidth()
    const pageHeightMm = pdf.internal.pageSize.getHeight()
    const marginMm = 10
    const contentWidthMm = pageWidthMm - marginMm * 2

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]!
      const scale = canvasScaleForElement(target)
      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(target.scrollWidth, host.clientWidth),
        windowHeight: target.scrollHeight,
      })

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('html2canvas produced an empty canvas')
      }

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
    host.remove()
    window.scrollTo(scrollX, scrollY)
  }
}

function splitHtmlDocument(html: string): { styleCss: string; bodyHtml: string } {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const styleCss = styleMatch?.[1] ?? ''
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch?.[1] ?? html
  return { styleCss, bodyHtml }
}

/** Keep canvas under iOS Safari’s ~4096² limit (html2canvas blank-page bug). */
function canvasScaleForElement(el: HTMLElement): number {
  const w = Math.max(1, el.scrollWidth)
  const h = Math.max(1, el.scrollHeight)
  const maxEdge = 4096
  const maxScale = Math.min(maxEdge / w, maxEdge / h, 2)
  return Math.max(1, Math.floor(maxScale * 10) / 10)
}

/**
 * #918 — a `.pdf-page` is 180mm wide, then its image is scaled to the PDF's
 * 190mm printable width. The 277mm printable height therefore fits at most
 * 277 * 180 / 190 mm of source height (about 992px at 96dpi). Leave a small
 * buffer for canvas rounding so a few blank pixels never become another PDF
 * sheet in the fallback image slicer.
 */
const MAX_STYLED_PAGE_PX = 980

function explodeOverflowingPdfPages(host: HTMLElement): void {
  const root = host.querySelector('.pdf-root')
  if (!root) return

  for (const page of [
    ...root.querySelectorAll<HTMLElement>(':scope > .pdf-page'),
  ]) {
    if (page.scrollHeight <= MAX_STYLED_PAGE_PX) continue

    const body = page.querySelector<HTMLElement>('.pdf-page-body')
    if (!body) continue
    const kids = [...body.children] as HTMLElement[]
    if (kids.length < 2) continue

    const footer = page.querySelector('.pdf-footer')
    const footerHtml = footer?.outerHTML ?? ''
    const insertBefore = page.nextSibling

    // Detach original; rebuild as one or more fitting pages.
    page.remove()

    let current = makeEmptyPdfPage(footerHtml)
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
        current = makeEmptyPdfPage(footerHtml)
        currentBody = current.querySelector<HTMLElement>('.pdf-page-body')!
        currentBody.appendChild(overflow)
        root.insertBefore(current, insertBefore)
      }
    }
  }
}

function makeEmptyPdfPage(footerHtml: string): HTMLElement {
  const page = document.createElement('section')
  page.className = 'pdf-page'
  page.innerHTML = `<div class="pdf-page-body"></div>${footerHtml}`
  return page
}

/** Exported for unit tests (#908 packing). */
export function explodeOverflowingPdfPagesForTest(host: HTMLElement): void {
  explodeOverflowingPdfPages(host)
}
