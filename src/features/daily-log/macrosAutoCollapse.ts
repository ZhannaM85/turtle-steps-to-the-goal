import { useEffect, useRef } from 'react'
import { getAppScrollport, getAppScrollTop } from '@/shared/lib/appScroll'
import { useTodaySectionsCollapseStore } from '@/stores/todaySectionsCollapseStore'

/**
 * #1036 — how far the expanded КБЖУ header must pass the sticky day
 * chrome, on a downward scroll, before it collapses. The band is wider
 * than the #1025 strip's height change, so that edge cannot flip the
 * section open and closed.
 */
export const MACROS_AUTO_COLLAPSE_HYSTERESIS_PX = 48

/** Ignore scroll events this long after the chevron opens КБЖУ, so the
 * expand's own layout shift is not read as a downward scroll. */
export const MACROS_EXPAND_SCROLL_GUARD_MS = 200

/**
 * #1036 — collapse expanded Day КБЖУ once, when a downward scroll carries
 * its header past the sticky date chrome. #1038 — after that automatic
 * collapse, an upward scroll expands it again once the row has left the
 * stick line by the same hysteresis. A chevron close is not automatic, so
 * scroll never opens it.
 *
 * The header has to be seen in the useful area first (`armed`) or, if it
 * was opened already past the line, the user has to scroll down by the
 * hysteresis. A chevron open is therefore not undone until they scroll.
 */
export function nextMacrosAutoCollapse(input: {
  armed: boolean
  downwardPx: number
  /** Positive when content moves up (the user scrolled down). */
  scrollDelta: number
  sectionTop: number
  chromeBottom: number
  /** True only after this hook collapsed the section, not the chevron. */
  autoCollapsed?: boolean
  /** Viewport Y where a stuck pin sits. Defaults to the date chrome. */
  stickLine?: number
}): { armed: boolean; collapse: boolean; expand: boolean; downwardPx: number } {
  const hysteresis = MACROS_AUTO_COLLAPSE_HYSTERESIS_PX
  if (input.autoCollapsed) {
    const stickLine = input.stickLine ?? input.chromeBottom
    const released =
      input.scrollDelta < 0 && input.sectionTop >= stickLine + hysteresis
    return { armed: released, collapse: false, expand: released, downwardPx: 0 }
  }

  if (input.sectionTop >= input.chromeBottom) {
    return { armed: true, collapse: false, expand: false, downwardPx: 0 }
  }

  const downwardPx = Math.max(0, input.downwardPx + input.scrollDelta)
  const pastCollapseLine = input.sectionTop < input.chromeBottom - hysteresis
  if (!pastCollapseLine || input.scrollDelta <= 0) {
    return { armed: input.armed, collapse: false, expand: false, downwardPx }
  }
  if (input.armed || downwardPx >= hysteresis) {
    return { armed: false, collapse: true, expand: false, downwardPx: 0 }
  }
  return { armed: false, collapse: false, expand: false, downwardPx }
}

function macrosStickLine(section: HTMLElement, chromeBottom: number): number {
  if (section.getAttribute('data-day-pin-sticky') !== 'true') return chromeBottom
  const top = Number.parseFloat(section.style.top)
  if (!Number.isFinite(top)) return chromeBottom
  const scroller = getAppScrollport()
  const origin = scroller instanceof HTMLElement ? scroller.getBoundingClientRect().top : 0
  return origin + top
}

/**
 * Collapse expanded Day КБЖУ on a clear scroll down, and open it again on
 * scroll up only when that collapse was automatic and the row is back in
 * flow. A chevron close stays closed.
 */
export function useMacrosAutoCollapse(collapsed: boolean, enabled: boolean): void {
  const setCollapsed = useTodaySectionsCollapseStore((state) => state.setCollapsed)
  const armed = useRef(false)
  const downwardPx = useRef(0)
  const prevCollapsed = useRef(collapsed)
  const expandedAt = useRef(0)
  const autoCollapsed = useRef(false)

  useEffect(() => {
    if (!enabled) {
      armed.current = false
      downwardPx.current = 0
      autoCollapsed.current = false
      prevCollapsed.current = collapsed
      return
    }

    if (prevCollapsed.current && !collapsed) {
      autoCollapsed.current = false
      expandedAt.current = performance.now()
    }
    prevCollapsed.current = collapsed

    if (collapsed && !autoCollapsed.current) {
      armed.current = false
      downwardPx.current = 0
      return
    }

    const read = () => {
      const section = document.querySelector('[data-day-section="macros"]')
      if (!(section instanceof HTMLElement)) return null
      const intro = document.querySelector('[data-slot="day-intro"]')
      const chromeBottom =
        intro instanceof HTMLElement ? intro.getBoundingClientRect().bottom : 0
      return {
        sectionTop: section.getBoundingClientRect().top,
        chromeBottom,
        stickLine: macrosStickLine(section, chromeBottom),
      }
    }

    const apply = (scrollDelta: number) => {
      const geometry = read()
      if (!geometry) return
      const next = nextMacrosAutoCollapse({
        armed: armed.current,
        downwardPx: downwardPx.current,
        scrollDelta,
        sectionTop: geometry.sectionTop,
        chromeBottom: geometry.chromeBottom,
        autoCollapsed: autoCollapsed.current,
        stickLine: geometry.stickLine,
      })
      armed.current = next.armed
      downwardPx.current = next.downwardPx
      if (next.collapse) {
        const alreadyCollapsed =
          useTodaySectionsCollapseStore.getState().sections.macros
        if (!alreadyCollapsed) {
          autoCollapsed.current = true
          setCollapsed('macros', true)
        }
      } else if (next.expand) {
        autoCollapsed.current = false
        setCollapsed('macros', false)
      }
    }

    apply(0)

    let lastTop = getAppScrollTop()
    const onScroll = () => {
      const scrollTop = getAppScrollTop()
      if (
        !autoCollapsed.current &&
        expandedAt.current > 0 &&
        performance.now() - expandedAt.current < MACROS_EXPAND_SCROLL_GUARD_MS
      ) {
        lastTop = scrollTop
        return
      }
      const delta = scrollTop - lastTop
      lastTop = scrollTop
      if (Math.abs(delta) < 1) return
      apply(delta)
    }

    const scroller = getAppScrollport() ?? window
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [collapsed, enabled, setCollapsed])
}
