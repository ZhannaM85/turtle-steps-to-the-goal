/**
 * Decode HTML entities (`&quot;`, `&amp;`, `&#39;`, ...) in text sourced
 * from external APIs (Open Food Facts product/brand names, etc.) that
 * sometimes pass values through without decoding them first (#641).
 *
 * Uses `DOMParser` against a detached document — never attached to the
 * live page, so nothing here executes; it only reads back the decoded
 * text.
 */
export function decodeHtmlEntities(value: string): string {
  if (!value.includes('&')) return value
  const doc = new DOMParser().parseFromString(value, 'text/html')
  return doc.documentElement.textContent ?? value
}
