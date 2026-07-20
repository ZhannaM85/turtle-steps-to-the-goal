export type { Goal } from './Goal'
export type { GoalRepository } from './GoalRepository'
export { estimatedDailyCalorieDeficitKcal } from './calorieDeficit'
export { lbToKg, kgToLb } from './units'
export { goalWeekEnd, goalWindowProgress } from './goalWindowProgress'
export type { GoalWindowProgress } from './goalWindowProgress'
export { pastGoals } from './goalHistory'
export type { PastGoalRecord } from './goalHistory'
export {
  reachedGoalWindows,
  isDateWithinReachedWindow,
  isGoalMetOnDate,
} from './reachedGoalWindows'
export type { ReachedGoalWindow } from './reachedGoalWindows'
