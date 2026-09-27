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
 * its header past the sticky date chrome. Scroll up never expands it.
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
}): { armed: boolean; collapse: boolean; downwardPx: number } {
  const hysteresis = MACROS_AUTO_COLLAPSE_HYSTERESIS_PX
  if (input.sectionTop >= input.chromeBottom) {
    return { armed: true, collapse: false, downwardPx: 0 }
  }

  const downwardPx = Math.max(0, input.downwardPx + input.scrollDelta)
  const pastCollapseLine = input.sectionTop < input.chromeBottom - hysteresis
  if (!pastCollapseLine || input.scrollDelta <= 0) {
    return { armed: input.armed, collapse: false, downwardPx }
  }
  if (input.armed || downwardPx >= hysteresis) {
    return { armed: false, collapse: true, downwardPx: 0 }
  }
  return { armed: false, collapse: false, downwardPx }
}

/**
 * While Day КБЖУ is expanded, collapse it once on a clear scroll down.
 * Stays collapsed afterwards — only the chevron sets it open again.
 */
export function useMacrosAutoCollapse(collapsed: boolean, enabled: boolean): void {
  const setCollapsed = useTodaySectionsCollapseStore((state) => state.setCollapsed)
  const armed = useRef(false)
  const downwardPx = useRef(0)
  const prevCollapsed = useRef(collapsed)
  const expandedAt = useRef(0)

  useEffect(() => {
    if (!enabled || collapsed) {
      armed.current = false
      downwardPx.current = 0
      prevCollapsed.current = collapsed
      return
    }

    if (prevCollapsed.current) expandedAt.current = performance.now()
    prevCollapsed.current = false

    const read = () => {
      const section = document.querySelector('[data-day-section="macros"]')
      if (!(section instanceof HTMLElement)) return null
      const intro = document.querySelector('[data-slot="day-intro"]')
      const chromeBottom =
        intro instanceof HTMLElement ? intro.getBoundingClientRect().bottom : 0
      return { sectionTop: section.getBoundingClientRect().top, chromeBottom }
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
      })
      armed.current = next.armed
      downwardPx.current = next.downwardPx
      if (next.collapse) setCollapsed('macros', true)
    }

    apply(0)

    let lastTop = getAppScrollTop()
    const onScroll = () => {
      const scrollTop = getAppScrollTop()
      if (
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
