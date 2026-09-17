/**
 * #939 / #952 — temporary on-device PDF capture debug for iPhone Safari / PWA.
 *
 * Enable, then export a PDF or open the layout preview:
 *   - Settings → Export PDF: temporary layout debug toggle (#952)
 *   - query: `?pdfDebug=1` (kept in localStorage so later navigations still debug)
 *   - storage: `localStorage.setItem('pdfDebug', '1')`
 * Disable: Settings toggle Off, `?pdfDebug=0`, or `localStorage.removeItem('pdfDebug')`.
 *
 * Pages example:
 *   https://zhannam85.github.io/turtle-steps-to-the-goal/settings/pdf-layout?pdfDebug=1
 */

export const PDF_DEBUG_QUERY_PARAM = 'pdfDebug'
export const PDF_DEBUG_STORAGE_KEY = 'pdfDebug'
export const PDF_DEBUG_OVERLAY_ID = 'pdf-debug-overlay'

export interface PdfDebugFlagSource {
  search?: string
  hash?: string
  href?: string
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
}

export interface PdfPageLayoutSnapshot {
  index: number
  phase: 'beforeFill' | 'beforeCapture' | 'afterCapture'
  className: string
  offsetHeight: number
  scrollHeight: number
  clientHeight: number
  computedHeight: string
  computedMinHeight: string
  inlineHeight: string
  inlineMinHeight: string
  overflow: string
  overflowX: string
  overflowY: string
  clip: string
  clipPath: string
  contain: string
  fillExists: boolean
  fillHeight: string | null
  fillMinHeight: string | null
  fillOffsetHeight: number | null
  fillScrollHeight: number | null
  fillComputedHeight: string | null
  fillOffsetTop?: number | null
  footerExists: boolean
  footerOffsetHeight: number | null
  footerOffsetTop?: number | null
  canvasWidth?: number
  canvasHeight?: number
  captureHeightPx?: number
  scale?: number
  imgHeightMm?: number
  sourceCanvasHeight?: number
  pinnedFooter?: boolean
}

export interface PdfDebugReport {
  maxStyledPagePx: number
  a4FillTargetPx: number
  hostWidthPx: number
  marginMm: number
  contentWidthMm: number
  pageHeightMm: number
  userAgent: string
  viewport: string
  devicePixelRatio: number
  pages: PdfPageLayoutSnapshot[]
}

function parsePdfDebugFlag(
  raw: string | null | undefined,
): boolean | undefined {
  if (raw == null) return undefined
  const value = raw.trim().toLowerCase()
  if (value === '1' || value === 'true' || value === 'yes') return true
  if (value === '0' || value === 'false' || value === 'no') return false
  return undefined
}

function queryValue(search: string, key: string): string | null {
  const trimmed = search.startsWith('?') ? search.slice(1) : search
  if (!trimmed) return null
  try {
    return new URLSearchParams(trimmed).get(key)
  } catch {
    return null
  }
}

function queryValueFromHash(hash: string, key: string): string | null {
  const question = hash.indexOf('?')
  if (question < 0) return null
  return queryValue(hash.slice(question), key)
}

function liveLocation(): { search: string; hash: string; href: string } {
  if (typeof window === 'undefined') {
    return { search: '', hash: '', href: '' }
  }
  return {
    search: window.location.search,
    hash: window.location.hash,
    href: window.location.href,
  }
}

function liveStorage(): Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
> | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function resolveSource(source: PdfDebugFlagSource = {}): {
  search: string
  hash: string
  href: string
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
} {
  const live = liveLocation()
  return {
    search: source.search ?? live.search,
    hash: source.hash ?? live.hash,
    href: source.href ?? live.href,
    storage: source.storage === undefined ? liveStorage() : source.storage,
  }
}

function flagFromUrl(
  search: string,
  hash: string,
  href: string,
): boolean | undefined {
  const fromSearch = parsePdfDebugFlag(
    queryValue(search, PDF_DEBUG_QUERY_PARAM),
  )
  if (fromSearch !== undefined) return fromSearch
  const fromHash = parsePdfDebugFlag(
    queryValueFromHash(hash, PDF_DEBUG_QUERY_PARAM),
  )
  if (fromHash !== undefined) return fromHash
  if (href) {
    try {
      const url = new URL(href)
      const fromHref = parsePdfDebugFlag(
        url.searchParams.get(PDF_DEBUG_QUERY_PARAM),
      )
      if (fromHref !== undefined) return fromHref
      return parsePdfDebugFlag(
        queryValueFromHash(url.hash, PDF_DEBUG_QUERY_PARAM),
      )
    } catch {
      return undefined
    }
  }
  return undefined
}

/** True when `?pdfDebug=1` (or hash/href) or localStorage `pdfDebug=1`. */
export function isPdfDebugEnabled(source: PdfDebugFlagSource = {}): boolean {
  const resolved = resolveSource(source)
  const fromUrl = flagFromUrl(resolved.search, resolved.hash, resolved.href)
  if (fromUrl !== undefined) return fromUrl
  try {
    return (
      parsePdfDebugFlag(resolved.storage?.getItem(PDF_DEBUG_STORAGE_KEY)) ===
      true
    )
  } catch {
    return false
  }
}

/**
 * #952 — Settings toggle. Same localStorage key as `?pdfDebug=1`.
 * Enable writes `pdfDebug=1`; disable removes the key.
 */
export function setPdfDebugEnabled(
  enabled: boolean,
  source: PdfDebugFlagSource = {},
): void {
  const resolved = resolveSource(source)
  if (!resolved.storage) return
  try {
    if (enabled) resolved.storage.setItem(PDF_DEBUG_STORAGE_KEY, '1')
    else resolved.storage.removeItem(PDF_DEBUG_STORAGE_KEY)
  } catch {
    // Safari private mode / blocked storage — query flag still works.
  }
}

/**
 * Keep debug on after the query drops (in-app navigation). `?pdfDebug=0`
 * clears the stored flag.
 */
export function persistPdfDebugFlagFromLocation(
  source: PdfDebugFlagSource = {},
): void {
  const resolved = resolveSource(source)
  const fromUrl = flagFromUrl(resolved.search, resolved.hash, resolved.href)
  if (fromUrl === undefined) return
  setPdfDebugEnabled(fromUrl, { ...source, storage: resolved.storage })
}

export function isPdfDebugOverlayElement(element: Element): boolean {
  return Boolean(
    element.id === PDF_DEBUG_OVERLAY_ID ||
    element.closest(`#${PDF_DEBUG_OVERLAY_ID}`),
  )
}

function computed(el: Element): CSSStyleDeclaration | null {
  if (
    typeof window === 'undefined' ||
    typeof window.getComputedStyle !== 'function'
  ) {
    return null
  }
  try {
    return window.getComputedStyle(el)
  } catch {
    return null
  }
}

export function collectPdfPageLayoutSnapshot(
  page: HTMLElement,
  index: number,
  phase: PdfPageLayoutSnapshot['phase'],
): PdfPageLayoutSnapshot {
  const style = computed(page)
  const fill = page.querySelector<HTMLElement>('.pdf-page-fill')
  const fillStyle = fill ? computed(fill) : null
  const footer = page.querySelector<HTMLElement>('.pdf-footer')
  const pageTop = page.getBoundingClientRect().top
  const fillOffsetTop = fill ? fill.getBoundingClientRect().top - pageTop : null
  const footerOffsetTop = footer
    ? footer.getBoundingClientRect().top - pageTop
    : null
  return {
    index,
    phase,
    className: page.className,
    offsetHeight: page.offsetHeight,
    scrollHeight: page.scrollHeight,
    clientHeight: page.clientHeight,
    computedHeight: style?.height ?? '',
    computedMinHeight: style?.minHeight ?? '',
    inlineHeight: page.style.height,
    inlineMinHeight: page.style.minHeight,
    overflow: style?.overflow ?? '',
    overflowX: style?.overflowX ?? '',
    overflowY: style?.overflowY ?? '',
    clip: style?.clip ?? '',
    clipPath: style?.clipPath ?? '',
    contain: style?.contain ?? '',
    fillExists: Boolean(fill),
    fillHeight: fill?.style.height ?? null,
    fillMinHeight: fill?.style.minHeight ?? null,
    fillOffsetHeight: fill?.offsetHeight ?? null,
    fillScrollHeight: fill?.scrollHeight ?? null,
    fillComputedHeight: fillStyle?.height ?? null,
    fillOffsetTop,
    footerExists: Boolean(footer),
    footerOffsetHeight: footer?.offsetHeight ?? null,
    footerOffsetTop,
  }
}

export function applyPdfDebugOutlines(host: HTMLElement): void {
  for (const page of host.querySelectorAll<HTMLElement>('.pdf-page')) {
    page.style.outline = '3px solid #ff2bd6'
    page.style.outlineOffset = '-3px'
  }
  for (const footer of host.querySelectorAll<HTMLElement>('.pdf-footer')) {
    footer.style.outline = '3px solid #00e5ff'
    footer.style.outlineOffset = '-3px'
  }
  for (const fill of host.querySelectorAll<HTMLElement>('.pdf-page-fill')) {
    fill.style.outline = '3px solid #b8ff00'
    fill.style.outlineOffset = '-3px'
  }
}

function round1(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : String(value)
}

export function formatPdfDebugReport(report: PdfDebugReport): string {
  const lines = [
    'PDF debug #939 (temporary, not a layout fix)',
    `UA: ${report.userAgent}`,
    `viewport: ${report.viewport} dpr=${report.devicePixelRatio}`,
    `MAX_STYLED_PAGE_PX: ${report.maxStyledPagePx}`,
    `A4 fill target used: ${report.a4FillTargetPx}px`,
    `host width: ${report.hostWidthPx}px`,
    `PDF page: ${report.pageHeightMm}mm, margin ${report.marginMm}mm, content width ${report.contentWidthMm}mm`,
    '',
  ]

  const byPage = new Map<number, PdfPageLayoutSnapshot[]>()
  for (const page of report.pages) {
    const list = byPage.get(page.index) ?? []
    list.push(page)
    byPage.set(page.index, list)
  }

  for (const [index, snapshots] of byPage) {
    lines.push(`=== page ${index + 1} ===`)
    for (const snap of snapshots) {
      lines.push(`-- ${snap.phase} --`)
      lines.push(
        `offset/scroll/client: ${snap.offsetHeight} / ${snap.scrollHeight} / ${snap.clientHeight}`,
      )
      lines.push(
        `computed height/min-height: ${snap.computedHeight} / ${snap.computedMinHeight}`,
      )
      lines.push(
        `inline height/min-height: ${snap.inlineHeight || '(empty)'} / ${snap.inlineMinHeight || '(empty)'}`,
      )
      lines.push(
        `overflow/x/y: ${snap.overflow} / ${snap.overflowX} / ${snap.overflowY}`,
      )
      lines.push(
        `clip/clipPath/contain: ${snap.clip} / ${snap.clipPath} / ${snap.contain}`,
      )
      lines.push(
        `.pdf-page-fill: ${
          snap.fillExists
            ? `yes height=${snap.fillHeight} min=${snap.fillMinHeight} offset=${snap.fillOffsetHeight} scroll=${snap.fillScrollHeight} computed=${snap.fillComputedHeight} top=${snap.fillOffsetTop ?? '?'}`
            : 'NO'
        }`,
      )
      if (
        snap.fillExists &&
        snap.fillOffsetTop != null &&
        snap.footerOffsetTop != null
      ) {
        lines.push(
          `.pdf-page-fill vs footer: ${
            snap.fillOffsetTop >= snap.footerOffsetTop
              ? 'BELOW footer'
              : 'above footer'
          }`,
        )
      }
      lines.push(
        `.pdf-footer: ${
          snap.footerExists
            ? `yes offset=${snap.footerOffsetHeight} top=${snap.footerOffsetTop ?? '?'}`
            : 'NO'
        }`,
      )
      if (snap.phase === 'afterCapture') {
        lines.push(
          `canvas: ${snap.canvasWidth} x ${snap.canvasHeight} (scale=${snap.scale}, captureHeightPx=${snap.captureHeightPx})`,
        )
        if (snap.sourceCanvasHeight != null) {
          lines.push(
            `source canvas height: ${snap.sourceCanvasHeight}px, pinnedFooter=${
              snap.pinnedFooter ? 'yes' : 'no'
            }`,
          )
        }
        if (snap.imgHeightMm != null) {
          const leftoverMm =
            report.pageHeightMm - report.marginMm - snap.imgHeightMm
          lines.push(
            `placed image height: ${round1(snap.imgHeightMm)}mm at y=${report.marginMm}mm`,
          )
          lines.push(`gap below image to page bottom: ${round1(leftoverMm)}mm`)
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n').trimEnd()
}
