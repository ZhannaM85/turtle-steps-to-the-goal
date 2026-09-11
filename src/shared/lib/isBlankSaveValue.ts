/**
 * #854 — empty / whitespace-only is not a persistable Day save.
 * Optional fields may stay unused (`undefined`); the bug is writing a
 * blank string (or flipping a numeric field to a dash) via ✓.
 */
export function isBlankSaveValue(
  value: unknown,
): value is undefined | null | '' {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  return false
}

/** Non-blank text trimmed; otherwise the last saved value (or unset). */
export function persistableText(
  draft: unknown,
  lastSaved: string | undefined,
): string | undefined {
  if (typeof draft === 'string' && !isBlankSaveValue(draft)) {
    return draft.trim()
  }
  return isBlankSaveValue(lastSaved) ? undefined : lastSaved
}
