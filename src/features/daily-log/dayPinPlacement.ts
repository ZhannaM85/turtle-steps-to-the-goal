import type { DaySectionPinId } from '@/stores/daySectionPinStore'
import {
  TODAY_SECTION_KEYS,
  type TodaySectionKey,
} from '@/stores/todaySectionsCollapseStore'

/**
 * #1031 — pin and sticky are separate.
 * A pin always sorts the section to the top of the Day list (`flow`).
 * Sticky is only the collapsed pin, so an expanded one scrolls away.
 */
export function dayPinSortsToTop(pinned: boolean): boolean {
  return pinned
}

export function dayPinSticks(pinned: boolean, collapsed: boolean): boolean {
  return pinned && collapsed
}

/** Accordion sections stick only while collapsed. Sleep and nutrition
 * notes have no accordion, so a pin still sticks (#1022). */
export function todayCollapseKey(id: DaySectionPinId): TodaySectionKey | null {
  return (TODAY_SECTION_KEYS as readonly string[]).includes(id)
    ? (id as TodaySectionKey)
    : null
}

export function daySectionSticks(
  collapsed: boolean | null,
  stickOverride: boolean | undefined,
): boolean {
  if (stickOverride !== undefined) return stickOverride
  if (collapsed === null) return true
  return collapsed
}

/** Sticky `top` so a collapsed pin sits under the date chrome, and a
 * second collapsed pin stacks under the first instead of covering it. */
export function stickyStackTopPx(
  introHeight: number,
  previousStickyHeights: readonly number[],
): number {
  let top = introHeight
  for (const height of previousStickyHeights) top += height
  return Math.ceil(top)
}
