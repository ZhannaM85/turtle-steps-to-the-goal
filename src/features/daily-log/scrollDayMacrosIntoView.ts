import { getAppScrollport } from '@/shared/lib/appScroll'
import { daySectionScrollTop } from './dayKcalStripModel'

/**
 * Scroll Day КБЖУ under the sticky date chrome. Used by the header kcal
 * strip (#1022) so tapping the strip jumps back to the section.
 */
export function scrollDayMacrosIntoView(
  behavior: ScrollBehavior = 'smooth',
): void {
  const section = document.querySelector('[data-day-section="macros"]')
  if (!(section instanceof HTMLElement)) return
  const scroller = getAppScrollport()
  const intro = document.querySelector('[data-slot="day-intro"]')
  const introHeight = intro?.getBoundingClientRect().height ?? 0
  if (!scroller) {
    if (typeof section.scrollIntoView === 'function') {
      section.scrollIntoView({ block: 'start', behavior })
    }
    return
  }
  const top = daySectionScrollTop({
    scrollTop: scroller.scrollTop,
    sectionTop: section.getBoundingClientRect().top,
    scrollerTop: scroller.getBoundingClientRect().top,
    introHeight,
  })
  if (typeof scroller.scrollTo === 'function') {
    scroller.scrollTo({ top, behavior })
    return
  }
  scroller.scrollTop = top
}
