import { formatNumber, type Dictionary, type Locale } from '@/i18n'

/**
 * #1022 / #1029 — whether the one-line kcal strip should paint.
 * It is the collapsed summary's sticky stand-in: only after that
 * collapsed row leaves the screen. Expanded КБЖУ scrolls with the
 * page, so the strip stays off even when the cards are gone. A pin
 * that still has the collapsed row on screen also wins — no second copy.
 */
export function kcalStripVisible(input: {
  hasSummary: boolean
  summaryInView: boolean
  collapsed: boolean
}): boolean {
  return input.hasSummary && input.collapsed && !input.summaryInView
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

/** `640/770 ккал`, plus compact `Б 31/65 г` when any macro is logged.
 * #1034 — numerator is eaten, denominator is the daily goal (the same
 * targets the expanded cards use). Remaining stays on those cards.
 * A missing goal omits the slash for that figure only. */
export function formatDayKcalStrip(input: {
  consumedKcal: number
  kcalTarget?: number
  proteinG: number | undefined
  proteinTargetG?: number
  fatG: number | undefined
  fatTargetG?: number
  carbG: number | undefined
  carbTargetG?: number
  locale: Locale
  t: Dictionary
}): { kcal: string; macros: string | null } {
  const unit = input.t.dailyEntry.gramsUnit
  return {
    kcal: formatConsumedOverTarget(
      input.consumedKcal,
      input.kcalTarget,
      input.locale,
      input.t.dailyEntry.kcalUnit,
    ),
    macros:
      input.proteinG === undefined &&
      input.fatG === undefined &&
      input.carbG === undefined
        ? null
        : input.t.dailyEntry.macrosSummaryCompact(
            formatConsumedOverTarget(
              input.proteinG,
              input.proteinTargetG,
              input.locale,
              unit,
            ),
            formatConsumedOverTarget(
              input.fatG,
              input.fatTargetG,
              input.locale,
              unit,
            ),
            formatConsumedOverTarget(
              input.carbG,
              input.carbTargetG,
              input.locale,
              unit,
            ),
          ),
  }
}

/** `31/65 г` when a daily goal is set, otherwise `31 г` or `—`. */
function formatConsumedOverTarget(
  consumed: number | undefined,
  target: number | undefined,
  locale: Locale,
  unit: string,
): string {
  if (consumed === undefined && target === undefined) return '—'
  const eaten = consumed === undefined ? '—' : formatNumber(consumed, locale, 0)
  const pair =
    target === undefined ? eaten : `${eaten}/${formatNumber(target, locale, 0)}`
  return `${pair} ${unit}`
}
