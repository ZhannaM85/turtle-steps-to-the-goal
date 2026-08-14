import { SHARE_FOOD_QUERY_PARAM } from '@/features/food-share/sharedFoodPayload'
import { SHARE_DAY_QUERY_PARAM } from '@/features/local-transfer/daySnippetPayload'

/**
 * #724 — turn an OS-delivered URL (custom scheme, https Pages link, or
 * Capacitor localhost) into a React Router search string the existing
 * import hosts already watch. Android share-sheet intents stay on #717.
 */
export function searchFromIncomingShareUrl(urlString: string): string | null {
  const day = queryValue(urlString, SHARE_DAY_QUERY_PARAM)
  if (day) {
    return `?${SHARE_DAY_QUERY_PARAM}=${encodeURIComponent(day)}`
  }
  const food = queryValue(urlString, SHARE_FOOD_QUERY_PARAM)
  if (food) {
    return `?${SHARE_FOOD_QUERY_PARAM}=${encodeURIComponent(food)}`
  }
  return null
}

function queryValue(urlString: string, key: string): string | null {
  try {
    const value = new URL(urlString).searchParams.get(key)
    if (value) return value
  } catch {
    // Custom schemes can fail URL parsing depending on the host form.
  }
  const match = new RegExp(`(?:^|[?&])${key}=([^&#]+)`).exec(urlString)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}
