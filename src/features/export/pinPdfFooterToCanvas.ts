/**
 * #958 / #960 — pack diary pages without a `.pdf-page-fill` strut under
 * `.pdf-footer`. Block in-flow layout (not flex min-height / space-between)
 * keeps Water rows and Notes header+body contiguous.
 *
 * Capture through the footer, then copy the body and footer at 1:1 pixel
 * scale onto an A4-height canvas. The footer sits at the normal bottom
 * margin without restoring the old under-footer fill strut.
 */

export const PDF_PAGE_FILL_CLASS = 'pdf-page-fill'
export const PDF_MARGIN_MM = 10
export const PDF_PAGE_HEIGHT_MM = 297

export function isPdfPageFillElement(element: Element): boolean {
  return (
    element.classList.contains(PDF_PAGE_FILL_CLASS) ||
    Boolean(element.closest(`.${PDF_PAGE_FILL_CLASS}`))
  )
}

/** Canvas pixel height that fills A4 minus ~10mm margins. */
export function a4ContentCanvasHeightPx(
  canvasWidth: number,
  contentWidthMm: number,
): number {
  const printableHeightMm = PDF_PAGE_HEIGHT_MM - PDF_MARGIN_MM * 2
  const widthMm = Math.max(contentWidthMm, 1)
  return Math.max(
    1,
    Math.round(
      ((printableHeightMm - 0.25) * Math.max(canvasWidth, 1)) / widthMm,
    ),
  )
}

export function pdfImageHeightMm(
  canvasWidth: number,
  canvasHeight: number,
  contentWidthMm: number,
): number {
  return (Math.max(canvasHeight, 1) * contentWidthMm) / Math.max(canvasWidth, 1)
}

/** #960 — top-pack a page (and Макет PDF / html2canvas clones). No flex stretch. */
export function packPdfPageElement(page: HTMLElement): void {
  page.style.display = 'block'
  page.style.height = 'auto'
  page.style.minHeight = '0px'
  page.style.alignContent = 'start'
  for (const el of page.querySelectorAll<HTMLElement>(
    '.pdf-page-body, .pdf-day-section, .pdf-day-section-content',
  )) {
    el.style.display = 'block'
    el.style.height = 'auto'
    el.style.minHeight = '0px'
    el.style.flexGrow = '0'
    el.style.flexShrink = '0'
    el.style.flexBasis = 'auto'
    el.style.alignContent = 'start'
  }
  const footer = page.querySelector<HTMLElement>('.pdf-footer')
  if (footer) {
    footer.style.display = 'block'
    footer.style.position = 'static'
    footer.style.marginTop = '8px'
    footer.style.flex = 'none'
  }
}

/** In-flow block page: no fill strut, no flex packing, footer after the body. */
export function preparePdfPagesForCapture(host: HTMLElement): void {
  for (const page of host.querySelectorAll<HTMLElement>('.pdf-page')) {
    page
      .querySelectorAll(`.${PDF_PAGE_FILL_CLASS}`)
      .forEach((el) => el.remove())
    packPdfPageElement(page)
  }
}

/**
 * Place separately captured body and footer canvases onto A4 paper. No body
 * pixels are sliced from a footer position reported by WebKit.
 */
export function pinPdfFooterToCanvasBottom(
  bodyCanvas: HTMLCanvasElement,
  footerCanvas: HTMLCanvasElement,
  destHeightPx: number,
): HTMLCanvasElement {
  if (bodyCanvas.height < 1 || footerCanvas.height < 1) return bodyCanvas
  const naturalHeight = bodyCanvas.height + footerCanvas.height
  const outputHeight = Math.max(destHeightPx, naturalHeight)

  const dest = bodyCanvas.ownerDocument.createElement('canvas')
  dest.width = bodyCanvas.width
  dest.height = outputHeight
  const ctx = dest.getContext('2d')
  if (!ctx) return bodyCanvas
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, dest.width, dest.height)
  ctx.drawImage(bodyCanvas, 0, 0)
  ctx.drawImage(
    footerCanvas,
    0,
    outputHeight - footerCanvas.height,
  )
  return dest
}
