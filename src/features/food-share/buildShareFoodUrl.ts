import {
  encodeSharedFoodPayload,
  SHARE_FOOD_QUERY_PARAM,
  type SharedFoodPayload,
} from './sharedFoodPayload'

/** Absolute app URL carrying the food payload in `?shareFood=`. */
export function buildShareFoodUrl(
  payload: SharedFoodPayload,
  options?: { origin?: string; baseUrl?: string },
): string {
  const origin = options?.origin ?? window.location.origin
  const baseUrl = options?.baseUrl ?? import.meta.env.BASE_URL
  const url = new URL(baseUrl, origin)
  url.searchParams.set(
    SHARE_FOOD_QUERY_PARAM,
    encodeSharedFoodPayload(payload),
  )
  return url.toString()
}
