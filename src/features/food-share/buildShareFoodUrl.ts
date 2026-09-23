import {
  encodeSharedFoodBatchPayload,
} from './sharedFoodBatchPayload'
import {
  encodeSharedFoodPayload,
  SHARE_FOOD_QUERY_PARAM,
  type SharedFoodPayload,
} from './sharedFoodPayload'

function buildShareFoodQueryUrl(
  encoded: string,
  options?: { origin?: string; baseUrl?: string },
): string {
  const origin = options?.origin ?? window.location.origin
  const baseUrl = options?.baseUrl ?? import.meta.env.BASE_URL
  const url = new URL(baseUrl, origin)
  url.searchParams.set(SHARE_FOOD_QUERY_PARAM, encoded)
  return url.toString()
}

/** Absolute app URL carrying one food in `?shareFood=`. */
export function buildShareFoodUrl(
  payload: SharedFoodPayload,
  options?: { origin?: string; baseUrl?: string },
): string {
  return buildShareFoodQueryUrl(encodeSharedFoodPayload(payload), options)
}

/** Same query param as {@link buildShareFoodUrl}, with a `v: 2` batch. */
export function buildShareFoodBatchUrl(
  items: readonly SharedFoodPayload[],
  options?: { origin?: string; baseUrl?: string },
): string {
  return buildShareFoodQueryUrl(encodeSharedFoodBatchPayload(items), options)
}
