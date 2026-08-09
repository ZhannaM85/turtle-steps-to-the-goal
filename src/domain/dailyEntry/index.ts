export type {
  CalorieEntry,
  CalorieItem,
  DailyEntry,
  DayTotals,
  Emotion,
  MealEmotion,
  WaterEntry,
} from './DailyEntry'
export type { DailyEntryRepository } from './DailyEntryRepository'
export { totalCalories } from './totalCalories'
export {
  totalProtein,
  totalFat,
  totalCarbs,
  totalFiber,
  totalSodium,
  totalPotassium,
  totalMagnesium,
} from './totalMacros'
export { totalWaterMl } from './totalWaterMl'
export { hadNightEating } from './nightEating'
export {
  calorieEntryKcal,
  calorieEntryProtein,
  calorieEntryFat,
  calorieEntryCarbs,
  calorieEntryFiber,
} from './calorieEntryTotals'
export {
  stampSlotDefaultsOnUntimedMeals,
  countUntimedSlotMeals,
} from './stampSlotDefaultTimes'
