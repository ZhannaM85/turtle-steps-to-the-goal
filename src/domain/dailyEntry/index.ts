export type {
  CalorieEntry,
  CalorieItem,
  DailyEntry,
  Emotion,
  MealEmotion,
  WaterEntry,
} from './DailyEntry'
export type { DailyEntryRepository } from './DailyEntryRepository'
export { totalCalories } from './totalCalories'
export { totalProtein, totalFat, totalCarbs, totalFiber } from './totalMacros'
export { totalWaterMl } from './totalWaterMl'
export { hadNightEating } from './nightEating'
export {
  calorieEntryKcal,
  calorieEntryProtein,
  calorieEntryFat,
  calorieEntryCarbs,
} from './calorieEntryTotals'
