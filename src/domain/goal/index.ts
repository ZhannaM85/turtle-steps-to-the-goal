export type { Goal } from './Goal'
export type { GoalRepository } from './GoalRepository'
export {
  estimatedDailyCalorieDeficitKcal,
  estimatedWeeklyLossKgFromDailyDeficitKcal,
  KCAL_PER_KG_FAT,
  WEEKLY_PACE_STEP_KG,
  WEEKLY_PACE_SOFT_WARN_KG,
} from './calorieDeficit'
export { lbToKg, kgToLb } from './units'
export {
  goalWeekEnd,
  goalWindowProgress,
  resolveBaselineWeightKg,
  goalWindowHasEnded,
  goalWindowConcluded,
  goalCoveringDate,
} from './goalWindowProgress'
export {
  goalWindowRange,
  goalWindowsOverlap,
  draftWindowOverlapsOthers,
  inclusiveDateRangesOverlap,
} from './goalWindowOverlap'
export type { GoalWindowProgress } from './goalWindowProgress'
export {
  roundKgToOneDecimal,
  weeklyLossTargetMet,
} from './weeklyLossTargetMet'
export { pastGoals, earliestGoalCreatedAt } from './goalHistory'
export type { PastGoalRecord } from './goalHistory'
export {
  reachedGoalWindows,
  isDateWithinReachedWindow,
  isGoalMetOnDate,
  isHeadingTowardGoalOnDate,
} from './reachedGoalWindows'
export type { ReachedGoalWindow } from './reachedGoalWindows'
export {
  paceCheckInsight,
  paceCheckChangeKind,
  PACE_CHECK_MIN_CONSECUTIVE_MISSES,
} from './paceCheck'
export type { PaceCheckInsight, PaceCheckChangeKind } from './paceCheck'
export { goalWindowAverages } from './weeklyReviewAverages'
