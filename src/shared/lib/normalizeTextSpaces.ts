/**
 * Replace Unicode space separators (especially NBSP U+00A0) with ASCII
 * spaces so line wrapping can break between words (#559).
 *
 * Pasted Level Kitchen / web titles often use `&nbsp;` between words.
 * With `overflow-wrap: normal` the browser treats those as one unbreakable
 * run — so a long dish name won't wrap to the next row and instead
 * overflows or gets mid-word-split if `break-words` is forced.
 *
 * `.trim()` alone does not convert interior NBSPs.
 */
const UNICODE_SPACE_RE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g

export function normalizeTextSpaces(value: string): string {
  return value.replace(UNICODE_SPACE_RE, ' ')
}
