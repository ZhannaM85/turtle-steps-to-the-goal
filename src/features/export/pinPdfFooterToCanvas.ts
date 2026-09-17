/**
 * #958 — pack diary pages without a `.pdf-page-fill` strut under `.pdf-footer`.
 * Block in-flow layout (not flex min-height) keeps Water/Notes intact.
 * Capture through the footer, then pin that slice to the A4 content canvas.
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

/** Canvas pixel height that places the image with a ~10mm PDF bottom margin. */
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

/** In-flow block page: no fill strut, no flex packing, footer after the body. */
export function preparePdfPagesForCapture(host: HTMLElement): void {
  for (const page of host.querySelectorAll<HTMLElement>('.pdf-page')) {
    page
      .querySelectorAll(`.${PDF_PAGE_FILL_CLASS}`)
      .forEach((el) => el.remove())
    page.style.display = 'block'
    page.style.height = 'auto'
    page.style.minHeight = '0px'
    const body = page.querySelector<HTMLElement>('.pdf-page-body')
    if (body) {
      body.style.display = 'block'
      body.style.flexGrow = '0'
      body.style.flexShrink = '0'
      body.style.flexBasis = 'auto'
      body.style.minHeight = '0px'
    }
    const footer = page.querySelector<HTMLElement>('.pdf-footer')
    if (footer) {
      footer.style.display = 'block'
      footer.style.position = 'static'
      footer.style.marginTop = '8px'
      footer.style.flex = 'none'
    }
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
 * Keep the bitmap tight through the footer, then draw that footer at the
 * bottom of the A4 content canvas so the PDF pad is outside the image.
 */
export function pinPdfFooterToCanvasBottom(
  canvas: HTMLCanvasElement,
  page: HTMLElement,
  destHeightPx: number,
  captureHeightPx: number,
): HTMLCanvasElement {
  if (destHeightPx <= canvas.height + 1) return canvas
  const slice = pdfFooterSourceFromCanvasBottom(
    canvas.height,
    page,
    captureHeightPx,
  )
  if (!slice) return canvas

  const dest = canvas.ownerDocument.createElement('canvas')
  dest.width = canvas.width
  dest.height = destHeightPx
  const ctx = dest.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, dest.width, dest.height)
  if (slice.y > 0) {
    ctx.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      slice.y,
      0,
      0,
      canvas.width,
      slice.y,
    )
  }
  ctx.drawImage(
    canvas,
    0,
    slice.y,
    canvas.width,
    slice.height,
    0,
    destHeightPx - slice.height,
    canvas.width,
    slice.height,
  )
  return dest
}
