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
export {
  ENTRY_FIELD_COMPARISON_VALENCE,
  comparisonDirection,
  comparisonTone,
  exactlyDaysBefore,
  fieldValueOnEntry,
  findFieldValueOnDate,
  findMostRecentPriorFieldValue,
  type ComparableEntryField,
  type ComparisonTone,
  type ComparisonValence,
  type FieldBaseline,
} from './entryFieldComparison'
