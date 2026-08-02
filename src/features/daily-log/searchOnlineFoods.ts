import { searchOpenFoodFacts, OFF_SEARCH_MIN_CHARS } from './searchOpenFoodFacts'
import { searchUsdaFoods } from './searchUsdaFoods'
import { searchRuFoodGenerics } from './ruFoodGenerics'
import type {
  OnlineFoodHit,
  OnlineSearchRemoteStatus,
  OnlineSearchResult,
} from './onlineFoodSearchTypes'

export type { OnlineFoodHit, OnlineSearchResult, OnlineSearchRemoteStatus }
export { OFF_SEARCH_MIN_CHARS }

const MAX_MERGED_HITS = 12

function mergeHits(
  bundled: OnlineFoodHit[],
  remote: OnlineFoodHit[],
): OnlineFoodHit[] {
  const seen = new Set<string>()
  const merged: OnlineFoodHit[] = []
  for (const hit of [...bundled, ...remote]) {
    const key = `${hit.name.toLowerCase()}|${hit.brand?.toLowerCase() ?? ''}|${hit.kcal100}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(hit)
    if (merged.length >= MAX_MERGED_HITS) break
  }
  return merged
}

/**
 * #535 — Add-meal online search: bundled RU generics always, then Open
 * Food Facts, then USDA FoodData Central when OFF fails or returns nothing
 * usable. Distinguishes outages from true empty results.
 */
export async function searchOnlineFoods(
  query: string,
  options: { signal?: AbortSignal; online?: boolean } = {},
): Promise<OnlineSearchResult> {
  const trimmed = query.trim()
  if (trimmed.length < OFF_SEARCH_MIN_CHARS) {
    return { hits: [], remoteStatus: 'empty', remoteSource: null }
  }

  const bundled = searchRuFoodGenerics(trimmed)
  const online = options.online !== false

  if (!online) {
    return {
      hits: bundled,
      remoteStatus: bundled.length > 0 ? 'ok' : 'empty',
      remoteSource: null,
    }
  }

  const off = await searchOpenFoodFacts(trimmed, { signal: options.signal })
  if (options.signal?.aborted || off.status === 'aborted') {
    return { hits: bundled, remoteStatus: 'aborted', remoteSource: null }
  }

  if (off.status === 'ok') {
    return {
      hits: mergeHits(bundled, off.hits),
      remoteStatus: 'ok',
      remoteSource: 'off',
    }
  }

  const usda = await searchUsdaFoods(trimmed, { signal: options.signal })
  if (options.signal?.aborted || usda.status === 'aborted') {
    return { hits: bundled, remoteStatus: 'aborted', remoteSource: null }
  }

  if (usda.status === 'ok') {
    return {
      hits: mergeHits(bundled, usda.hits),
      remoteStatus: 'ok',
      remoteSource: 'usda',
    }
  }

  // Both remotes failed or empty — still surface bundled staples.
  const remoteStatus: OnlineSearchRemoteStatus =
    off.status === 'unavailable' || usda.status === 'unavailable'
      ? 'unavailable'
      : 'empty'

  return {
    hits: bundled,
    remoteStatus,
    remoteSource: null,
  }
}
