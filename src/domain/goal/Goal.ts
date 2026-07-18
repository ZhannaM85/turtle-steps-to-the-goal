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
  createdAt: string
  updatedAt: string
}
