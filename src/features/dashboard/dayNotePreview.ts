/** #540 — short Day-note preview for outlier chips (CSS still truncates). */
export const DAY_NOTE_PREVIEW_MAX_CHARS = 48

/**
 * #711 — longer preview for correlation tooltips so notes can wrap across
 * lines under the tooltip max-width instead of a 48-char one-line ellipsis.
 * Still capped so a multi-paragraph note cannot blow up the popover.
 */
export const DAY_NOTE_TOOLTIP_MAX_CHARS = 160

/**
 * Trim and truncate a day note for compact UI. Returns `undefined` when
 * empty so callers can omit the line entirely.
 */
export function truncateDayNote(
  note: string | undefined | null,
  maxChars: number = DAY_NOTE_PREVIEW_MAX_CHARS,
): string | undefined {
  const trimmed = note?.trim()
  if (!trimmed) return undefined
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`
}

/**
 * Map each entry date to a note preview for correlation scatters / chips.
 * Default length is the tooltip budget (#711); chips still CSS-truncate.
 */
export function dayNotesByDate(
  entries: readonly { date: string; note?: string }[],
  maxChars: number = DAY_NOTE_TOOLTIP_MAX_CHARS,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of entries) {
    const preview = truncateDayNote(entry.note, maxChars)
    if (preview) map.set(entry.date, preview)
  }
  return map
}
