export type { Goal } from './Goal'
export type { GoalRepository } from './GoalRepository'
export { estimatedDailyCalorieDeficitKcal, WEEKLY_PACE_STEP_KG, WEEKLY_PACE_SOFT_WARN_KG } from './calorieDeficit'
export { lbToKg, kgToLb } from './units'
export { goalWeekEnd, goalWindowProgress, goalCoveringDate } from './goalWindowProgress'
export type { GoalWindowProgress } from './goalWindowProgress'
export { pastGoals, earliestGoalCreatedAt } from './goalHistory'
export type { PastGoalRecord } from './goalHistory'
export {
  reachedGoalWindows,
  isDateWithinReachedWindow,
  isGoalMetOnDate,
  isHeadingTowardGoalOnDate,
} from './reachedGoalWindows'
export type { ReachedGoalWindow } from './reachedGoalWindows'
