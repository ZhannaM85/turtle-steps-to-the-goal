import { formatNumber, type Dictionary, type Locale } from '@/i18n'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'

/**
 * #1022 — whether the one-line kcal strip should paint.
 * The full КБЖУ cards win whenever they intersect the scrollport
 * (including when a pin holds them in the sticky dock). A pinned
 * summary that has scrolled off still gets the strip — no second copy
 * while the cards themselves are on screen.
 */
export function kcalStripVisible(input: {
  hasSummary: boolean
  summaryInView: boolean
}): boolean {
  return input.hasSummary && !input.summaryInView
}

/** A pinned summary lives inside the sticky header, so the shrunk
 * rootMargin (meant to ignore content tucked under that header) would
 * mark it off-screen and leave the strip up next to the cards. */
export function rectIntersectsBand(
  rect: { top: number; bottom: number },
  band: { top: number; bottom: number },
): boolean {
  return rect.bottom > band.top && rect.top < band.bottom
}

/** True when the summary still has pixels below the sticky day chrome.
 * Compare live rects: a stale IntersectionObserver margin can report
 * the summary as visible in the same frame the strip mounts (#1025). */
export function summaryIsBelowStickyChrome(input: {
  summaryBottom: number
  chromeBottom: number
}): boolean {
  return input.summaryBottom > input.chromeBottom
}

/** Top rootMargin so "in view" means below the sticky day chrome.
 * The strip is inside that chrome, so `introHeight` already includes it
 * once the strip is mounted. Do not subtract the strip: the summary
 * moves down by the same growth, and a fixed edge lets it cross back
 * into view, which hides the strip and repeats (#1025). */
export function kcalStripRootMarginTopPx(introHeight: number): number {
  return Math.max(0, Math.ceil(introHeight))
}

export function daySectionScrollTop(input: {
  scrollTop: number
  sectionTop: number
  scrollerTop: number
  introHeight: number
}): number {
  const offset = kcalStripRootMarginTopPx(input.introHeight)
  return Math.max(
    0,
    input.scrollTop + input.sectionTop - input.scrollerTop - offset,
  )
}

/** `1 680 · −275 ккал`, plus compact Б/Ж/У when any macro is logged. */
export function formatDayKcalStrip(input: {
  consumedKcal: number
  remainingKcal: number | undefined
  proteinG: number | undefined
  fatG: number | undefined
  carbG: number | undefined
  locale: Locale
  t: Dictionary
}): { kcal: string; macros: string | null } {
  const consumed = formatNumber(input.consumedKcal, input.locale, 0)
  const unit = input.t.dailyEntry.kcalUnit
  const kcal =
    input.remainingKcal === undefined
      ? `${consumed} ${unit}`
      : `${consumed} · ${formatNumber(input.remainingKcal, input.locale, 0)} ${unit}`
  return {
    kcal,
    macros: macrosSummaryTextCompact(
      input.proteinG,
      input.fatG,
      input.carbG,
      input.locale,
      input.t,
    ),
  }
}
