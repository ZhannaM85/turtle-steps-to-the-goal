export interface Goal {
  id: string
  targetWeeklyLossKg: number // e.g. 1 — this week's target, renewed/edited week to week
  /**
   * ISO date the target was last saved (#135) — anchors a real 7-day
   * tracking window (`weekStart`..`weekStart + 6`), stamped fresh to
   * today on every save via `formValuesToGoal`, replacing the previous
   * behavior of labeling the target against whatever fixed Mon-Sun
   * calendar week happened to contain today. Optional only because a
   * goal saved before this field existed (or restored from an old
   * backup) won't have one until it's next saved — callers should treat
   * that as "no window info available," not crash.
   */
  weekStart?: string
  /**
   * Optional explicit end date for the window `weekStart` anchors (#659).
   * Defaults to `weekStart + 6 days` (`goalWeekEnd`) everywhere it's read
   * when unset — this field only exists so a window whose `weekStart`
   * landed on an inconvenient weekday (e.g. save-timing put it on a
   * Tuesday when the user expects Monday–Sunday) can be edited to end on
   * a different day, without touching `weekStart` itself or the separate
   * `weekStartStore` "Week starts on" setting (#135's calendar-grid-
   * independent windows, deliberately out of scope here).
   */
  weekEnd?: string
  /**
   * Optional daily calories target (#208) — independent of
   * targetWeeklyLossKg, purely additive so an existing goal without one
   * just reads as "no daily target set" rather than needing a migration.
   * Powers Today's "remaining calories" stat; nothing else reads it.
   */
  dailyCalorieTargetKcal?: number
  /**
   * Optional daily protein target in grams (#220) — same shape/reasoning
   * as dailyCalorieTargetKcal above, independent of it (someone might
   * want one without the other). Powers Today's "remaining protein"
   * stat; nothing else reads it.
   */
  dailyProteinTargetG?: number
  /**
   * Optional daily fat/carb targets in grams (#252) — same shape/reasoning
   * as dailyProteinTargetG above, each independent of the other three.
   * Power Today's "remaining fat"/"remaining carbs" stats; nothing else
   * reads them.
   */
  dailyFatTargetG?: number
  dailyCarbTargetG?: number
  /**
   * Optional daily fiber target in grams (#341) — same shape/reasoning as
   * the other macro targets above, independent of them. Powers Today's
   * "remaining fiber" stat; nothing else reads it.
   */
  dailyFiberTargetG?: number
  /**
   * Optional daily electrolyte targets in milligrams (#530) — same
   * independent optional shape as the macro targets above. Each powers
   * Today's matching Remaining card when that nutrient is also enabled
   * in Settings micronutrient tracking.
   */
  dailySodiumTargetMg?: number
  dailyPotassiumTargetMg?: number
  dailyMagnesiumTargetMg?: number
  /**
   * Optional daily water target in milliliters (#258) — same shape as the
   * macro targets above, independent of them. Only meaningful once #258's
   * opt-in water tracking is also turned on in Settings, but the field
   * itself doesn't need to know that — same "renders when set" pattern
   * every other daily target already uses. Powers Today's "remaining
   * water" stat; nothing else reads it.
   */
  dailyWaterTargetMl?: number
  /**
   * Optional starting-weight snapshot (#676), captured once when this
   * record was first created (`formValuesToGoal`'s fresh-record branch,
   * from whatever weight was most recently known at that moment — the
   * same value #675's card-display fallback used) and never touched
   * again, including by later "edit in place" saves of this same record.
   * Reported live: without this, the card's baseline line — and the
   * target-met/history comparison it's tied to — could silently shift
   * once a weigh-in for the goal's own `weekStart` day came in *after*
   * the goal was already created, since both used to be derived live
   * from whatever was logged on `weekStart` (`goalWindowProgress.ts`).
   * `goalWindowProgress` / `resolveBaselineWeightKg` MUST prefer this
   * persisted snapshot over any live `weekStart` weigh-in when present
   * (#676 HARD LOCK — do not invert; see CLAUDE.md Hard locks).
   * Legacy goals without the field fall back to live weekStart / prior-day.
   * Optional so an old goal never re-saved since #676
   * just reads as "no frozen baseline yet," same precedent every other
   * purely-additive field on this type follows.
   */
  baselineWeightKg?: number
  createdAt: string
  updatedAt: string
}
