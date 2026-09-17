/**
 * #958 / #960 — pack diary pages without a `.pdf-page-fill` strut under
 * `.pdf-footer`. Block in-flow layout (not flex min-height / space-between)
 * keeps Water rows and Notes header+body contiguous.
 *
 * Capture through the footer, then place the bitmap at **natural capture
 * height**. Do not stretch a short page onto a full-A4 canvas — leftover
 * paper below the image is letterbox, not whitespace inside the diary.
 */

export const PDF_PAGE_FILL_CLASS = 'pdf-page-fill'
export const PDF_MARGIN_MM = 10
export const PDF_PAGE_HEIGHT_MM = 297
/** #960 — treat stretch as a bug when placed/natural differs by more than this. */
export const PDF_STRETCH_EPSILON = 0.05

export function isPdfPageFillElement(element: Element): boolean {
  return (
    element.classList.contains(PDF_PAGE_FILL_CLASS) ||
    Boolean(element.closest(`.${PDF_PAGE_FILL_CLASS}`))
  )
}

/** Canvas pixel height that would fill A4 minus ~10mm margins (debug target). */
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

export interface PdfPageStretchMetrics {
  placedMm: number
  naturalMm: number
  stretchPlacedOverNatural: number
  stretchCanvasOverCapture: number
  stretchCanvasOverCaptureScaled: number
  stretchFlagged: boolean
}

/** #960 — placedMm / naturalMm and canvasH / (captureHeightPx × scale). */
export function pdfPageStretchMetrics(input: {
  canvasWidth: number
  canvasHeight: number
  sourceCanvasHeight: number
  captureHeightPx: number
  scale: number
  contentWidthMm: number
}): PdfPageStretchMetrics {
  const placedMm = pdfImageHeightMm(
    input.canvasWidth,
    input.canvasHeight,
    input.contentWidthMm,
  )
  const naturalMm = pdfImageHeightMm(
    input.canvasWidth,
    input.sourceCanvasHeight,
    input.contentWidthMm,
  )
  const stretchPlacedOverNatural = placedMm / Math.max(naturalMm, 0.01)
  const capture = Math.max(input.captureHeightPx, 1)
  const stretchCanvasOverCapture = input.canvasHeight / capture
  const scaledCapture = capture * Math.max(input.scale, 0.01)
  const stretchCanvasOverCaptureScaled = input.canvasHeight / scaledCapture
  const stretchFlagged =
    Math.abs(stretchPlacedOverNatural - 1) > PDF_STRETCH_EPSILON ||
    Math.abs(stretchCanvasOverCaptureScaled - 1) > PDF_STRETCH_EPSILON
  return {
    placedMm,
    naturalMm,
    stretchPlacedOverNatural,
    stretchCanvasOverCapture,
    stretchCanvasOverCaptureScaled,
    stretchFlagged,
  }
}

/**
 * Live CSS px from the page top through the last footer pixel.
 * Excludes page padding below the footer so that band is not rasterized.
 */
export function pdfCaptureHeightThroughFooterPx(page: HTMLElement): number {
  const boxHeight = Math.max(page.scrollHeight, page.offsetHeight, 1)
  const footer = page.querySelector<HTMLElement>('.pdf-footer')
  if (!footer) return boxHeight

  let throughFooter = 0
  const pageBox = page.getBoundingClientRect()
  const footerBox = footer.getBoundingClientRect()
  if (pageBox.height > 0 && footerBox.height > 0) {
    throughFooter = Math.ceil(footerBox.bottom - pageBox.top)
  }
  if (throughFooter < 1) {
    throughFooter = Math.ceil(
      (footer.offsetTop || 0) + Math.max(footer.offsetHeight, 0),
    )
  }
  if (throughFooter < 1) return boxHeight
  return Math.min(boxHeight, Math.max(throughFooter, 1))
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
 * Footer is last in-flow in the captured bitmap. Slice it from the canvas
 * bottom (offsetHeight × scale), not a flex getBoundingClientRect.
 */
export function pdfFooterSourceFromCanvasBottom(
  canvasHeight: number,
  page: HTMLElement,
  captureHeightPx: number,
): { y: number; height: number } | null {
  const footer = page.querySelector<HTMLElement>('.pdf-footer')
  if (!footer) return null
  const cssHeight = Math.max(captureHeightPx, 1)
  const scaleY = canvasHeight / cssHeight
  const footerH = Math.max(1, Math.round(footer.offsetHeight * scaleY))
  const y = canvasHeight - footerH
  if (y < 1 || footerH < 1) return null
  return { y, height: footerH }
}

/**
 * #960 — keep the captured bitmap's natural height. Padding a short page
 * onto an A4-tall canvas (the #958 pin) stretched Water/Notes in the JPEG
 * and in Макет PDF. Extra paper belongs below the placed image, not inside it.
 */
export function pinPdfFooterToCanvasBottom(
  canvas: HTMLCanvasElement,
): HTMLCanvasElement {
  return canvas
}
