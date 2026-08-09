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
  createdAt: string
  updatedAt: string
}
