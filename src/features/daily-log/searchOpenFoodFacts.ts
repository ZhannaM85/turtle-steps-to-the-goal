import { parseOffProduct } from './openFoodFactsParse'
import type { OffNutritionPer100g, OffProductIdentity } from './openFoodFactsParse'

export type OffSearchHit = OffProductIdentity & OffNutritionPer100g

/** Cap results — keeps UI snappy and respects OFF's search rate limits. */
export const OFF_SEARCH_PAGE_SIZE = 12

/** Explicit search only (#531) — never search-as-you-type (OFF: 10 req/min). */
export const OFF_SEARCH_MIN_CHARS = 2

export const OFF_FETCH_TIMEOUT_MS = 5000

const OFF_USER_AGENT =
  'TurtleStepsToTheGoal/1.0 (https://github.com/ZhannaM85/turtle-steps-to-the-goal)'

/**
 * Full-text product search via legacy `/cgi/search.pl` (#531).
 * Caller must gate on online + min chars and only invoke on an explicit
 * user action (button), never per keystroke — OFF rate-limits search and
 * asks clients not to search-as-you-type.
 */
export async function searchOpenFoodFacts(
  query: string,
  options: { signal?: AbortSignal; pageSize?: number } = {},
): Promise<OffSearchHit[]> {
  const trimmed = query.trim()
  if (trimmed.length < OFF_SEARCH_MIN_CHARS) return []

  const pageSize = options.pageSize ?? OFF_SEARCH_PAGE_SIZE
  const params = new URLSearchParams({
    search_terms: trimmed,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
    // Smaller payloads = faster parse on mobile.
    fields: 'code,product_name,brands,nutriments',
  })

  // Combine caller abort + timeout without AbortSignal.any (broader support).
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    OFF_FETCH_TIMEOUT_MS,
  )
  const onOuterAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onOuterAbort)

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': OFF_USER_AGENT },
      },
    )
    if (!response.ok) return []

    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null) return []
    const products = (data as { products?: unknown }).products
    if (!Array.isArray(products)) return []

    const hits: OffSearchHit[] = []
    for (const product of products) {
      if (hits.length >= pageSize) break
      const parsed = parseOffProduct(product)
      if (parsed) hits.push(parsed)
    }
    return hits
  } catch {
    // Timeout, abort, or malformed JSON — empty list; UI shows a quiet miss.
    return []
  } finally {
    clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', onOuterAbort)
  }
}
