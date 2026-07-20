/**
 * Ranks already-substring-matched search results so exact and whole-word
 * matches surface above ones where the query merely occurs mid-word (#204:
 * "сыр" substring-matching inside "сырой", an unrelated word that happens
 * to share a root, buried genuine "сыр" results below it). Matching itself
 * is unchanged by this — nothing is excluded, just reordered — so a
 * deliberate partial search (e.g. "яб" for "яблоко") still finds results,
 * just ranked below closer ones when both are present. `\b` isn't used for
 * the word-boundary check since it's based on `\w` (`[A-Za-z0-9_]` only),
 * which doesn't recognize Cyrillic letters as word characters.
 */
function matchRank(text: string, query: string): number {
  const lowerText = text.toLowerCase()
  if (lowerText === query) return 0
  const words = lowerText.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  if (words.includes(query)) return 1
  return 2
}

/** `items` must already be filtered to ones that match `query` (a
 * lowercased, trimmed search string) — this only reorders, it doesn't
 * decide inclusion. Ties keep their original relative order (stable
 * sort). */
export function rankBySearchMatch<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      rank: matchRank(getText(item), query),
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item)
}
