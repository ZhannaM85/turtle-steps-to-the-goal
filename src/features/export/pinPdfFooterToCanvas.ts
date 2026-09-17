/**
 * #939 — keep empty `.pdf-page-fill` out of the html2canvas bitmap.
 * Capture through `.pdf-footer`, then pin that slice to the A4 content box.
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

export function preparePdfPagesForCapture(host: HTMLElement): void {
  for (const page of host.querySelectorAll<HTMLElement>('.pdf-page')) {
    page
      .querySelectorAll(`.${PDF_PAGE_FILL_CLASS}`)
      .forEach((el) => el.remove())
    page.style.height = 'auto'
    page.style.minHeight = '0px'
    const body = page.querySelector<HTMLElement>('.pdf-page-body')
    if (body) {
      body.style.flexGrow = '0'
      body.style.flexShrink = '0'
      body.style.flexBasis = 'auto'
    }
    const footer = page.querySelector<HTMLElement>('.pdf-footer')
    if (footer) footer.style.marginTop = '0'
  }
}

function footerSliceTopCss(page: HTMLElement): number | null {
  const footer = page.querySelector<HTMLElement>('.pdf-footer')
  if (!footer) return null
  const pageBox = page.getBoundingClientRect()
  const footerBox = footer.getBoundingClientRect()
  const fromRect = footerBox.top - pageBox.top
  if (fromRect >= 1) return fromRect
  if (footer.offsetParent === page && footer.offsetTop >= 1)
    return footer.offsetTop
  return null
}

/**
 * Keep the bitmap tight through the footer, then draw that footer at the
 * bottom of the A4 content canvas so the PDF pad is outside the image.
 */
export function pinPdfFooterToCanvasBottom(
  canvas: HTMLCanvasElement,
  page: HTMLElement,
  destHeightPx: number,
): HTMLCanvasElement {
  if (destHeightPx <= canvas.height + 1) return canvas
  const footerTopCss = footerSliceTopCss(page)
  if (footerTopCss == null) return canvas

  const cssHeight = Math.max(page.scrollHeight, page.offsetHeight, 1)
  const scaleY = canvas.height / cssHeight
  const footerSrcY = Math.round(footerTopCss * scaleY)
  const footerSrcH = canvas.height - footerSrcY
  if (footerSrcY < 1 || footerSrcH < 1) return canvas

  const dest = canvas.ownerDocument.createElement('canvas')
  dest.width = canvas.width
  dest.height = destHeightPx
  const ctx = dest.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, dest.width, dest.height)
  if (footerSrcY > 0) {
    ctx.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      footerSrcY,
      0,
      0,
      canvas.width,
      footerSrcY,
    )
  }
  ctx.drawImage(
    canvas,
    0,
    footerSrcY,
    canvas.width,
    footerSrcH,
    0,
    destHeightPx - footerSrcH,
    canvas.width,
    footerSrcH,
  )
  return dest
}
