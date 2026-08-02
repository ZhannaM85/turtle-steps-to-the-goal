import type { OffNutritionPer100g, OffProductIdentity } from './openFoodFactsParse'

/** Shared hit shape for OFF / USDA / bundled RU (#531/#535). */
export type OnlineFoodHit = OffProductIdentity & OffNutritionPer100g

export type OnlineSearchRemoteStatus =
  | 'ok'
  | 'empty'
  | 'unavailable'
  | 'aborted'

export type OnlineSearchResult = {
  hits: OnlineFoodHit[]
  /** Status of the remote attempt (OFF, then USDA). Bundled RU may still
   * fill `hits` when remote is unavailable/empty. */
  remoteStatus: OnlineSearchRemoteStatus
  /** Which remote source produced hits, if any. */
  remoteSource: 'off' | 'usda' | null
}
