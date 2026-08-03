/** #540 — short Day-note preview for correlation tooltips / outlier chips. */
export const DAY_NOTE_PREVIEW_MAX_CHARS = 48

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

/** Map each entry date to a truncated note preview (dates without notes omitted). */
export function dayNotesByDate(
  entries: readonly { date: string; note?: string }[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of entries) {
    const preview = truncateDayNote(entry.note)
    if (preview) map.set(entry.date, preview)
  }
  return map
}
