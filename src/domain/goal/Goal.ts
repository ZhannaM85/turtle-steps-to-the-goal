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
   * Optional daily calories target (#208) — independent of
   * targetWeeklyLossKg, purely additive so an existing goal without one
   * just reads as "no daily target set" rather than needing a migration.
   * Powers Today's "remaining calories" stat; nothing else reads it.
   */
  dailyCalorieTargetKcal?: number
  createdAt: string
  updatedAt: string
}
