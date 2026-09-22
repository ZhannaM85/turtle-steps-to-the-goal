export const APP_SCROLLPORT_ID = 'main-content'

export function getAppScrollport(): HTMLElement | null {
  return document.getElementById(APP_SCROLLPORT_ID)
}

export function getAppScrollTop(): number {
  const main = getAppScrollport()
  return main ? main.scrollTop : window.scrollY
}

export function setAppScrollTop(top: number): void {
  const main = getAppScrollport()
  if (main) {
    main.scrollTop = top
    return
  }
  window.scrollTo(0, top)
}

function resetOverflowScrollers(): void {
  for (const node of document.querySelectorAll('*')) {
    if (!(node instanceof HTMLElement)) continue
    if (node.scrollTop <= 0) continue
    const { overflowY } = getComputedStyle(node)
    if (
      overflowY !== 'auto' &&
      overflowY !== 'scroll' &&
      overflowY !== 'overlay'
    ) {
      continue
    }
    node.scrollTop = 0
  }
}

/**
 * #979 — html/body overflow is locked (#970), so an iOS status-bar tap
 * cannot drive document scroll. The app header calls this, and nested
 * overflow scrollers reset too (same as my-money).
 */
export function scrollAppToTop(): void {
  window.scrollTo(0, 0)
  const main = getAppScrollport()
  if (main) main.scrollTop = 0
  resetOverflowScrollers()
}

function elementFromTarget(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target
  if (target instanceof Text) return target.parentElement
  return null
}

function isVerticallyScrollable(node: Element): boolean {
  const { overflowY } = getComputedStyle(node)
  if (
    overflowY !== 'auto' &&
    overflowY !== 'scroll' &&
    overflowY !== 'overlay'
  ) {
    return false
  }
  return node.scrollHeight > node.clientHeight + 1
}

/**
 * #970 — with AppShell locking document overflow, pull-to-refresh must
 * read `#main-content` (and any nested scroller under the touch), not
 * only `window.scrollY`.
 */
export function isAtRefreshableTop(target: EventTarget | null): boolean {
  const main = getAppScrollport()
  if (main && main.scrollTop > 0) return false
  if (window.scrollY > 0) return false

  let node: Element | null = elementFromTarget(target)
  while (node && node !== document.documentElement) {
    if (isVerticallyScrollable(node) && node.scrollTop > 0) return false
    node = node.parentElement
  }
  return true
}
