import { parseOffProduct } from './openFoodFactsParse'
import type { OnlineFoodHit } from './onlineFoodSearchTypes'

/** @deprecated Prefer `OnlineFoodHit` (#535) — same shape. */
export type OffSearchHit = OnlineFoodHit

/** Cap results — keeps UI snappy and respects OFF's search rate limits. */
export const OFF_SEARCH_PAGE_SIZE = 12

/** Explicit search only (#531) — never search-as-you-type (OFF: 10 req/min). */
export const OFF_SEARCH_MIN_CHARS = 2

export const OFF_FETCH_TIMEOUT_MS = 5000

const OFF_USER_AGENT =
  'TurtleStepsToTheGoal/1.0 (https://github.com/ZhannaM85/turtle-steps-to-the-goal)'

export type OffSearchOutcome =
  | { status: 'ok'; hits: OnlineFoodHit[] }
  | { status: 'empty'; hits: [] }
  | { status: 'unavailable'; hits: [] }
  | { status: 'aborted'; hits: [] }

/**
 * Full-text product search via legacy `/cgi/search.pl` (#531).
 * Caller must gate on online + min chars and only invoke on an explicit
 * user action (button), never per keystroke — OFF rate-limits search and
 * asks clients not to search-as-you-type.
 *
 * #535 — returns a status so 503/timeout are not mistaken for “no foods”.
 */
export async function searchOpenFoodFacts(
  query: string,
  options: { signal?: AbortSignal; pageSize?: number } = {},
): Promise<OffSearchOutcome> {
  const trimmed = query.trim()
  if (trimmed.length < OFF_SEARCH_MIN_CHARS) {
    return { status: 'empty', hits: [] }
  }

  const pageSize = options.pageSize ?? OFF_SEARCH_PAGE_SIZE
  const params = new URLSearchParams({
    search_terms: trimmed,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
    fields: 'code,product_name,brands,nutriments',
  })

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
    if (!response.ok) return { status: 'unavailable', hits: [] }

    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null) {
      return { status: 'unavailable', hits: [] }
    }
    const products = (data as { products?: unknown }).products
    if (!Array.isArray(products)) return { status: 'unavailable', hits: [] }

    const hits: OnlineFoodHit[] = []
    for (const product of products) {
      if (hits.length >= pageSize) break
      const parsed = parseOffProduct(product)
      if (parsed) hits.push(parsed)
    }
    return hits.length > 0
      ? { status: 'ok', hits }
      : { status: 'empty', hits: [] }
  } catch {
    if (options.signal?.aborted || controller.signal.aborted) {
      return { status: 'aborted', hits: [] }
    }
    return { status: 'unavailable', hits: [] }
  } finally {
    clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', onOuterAbort)
  }
}
