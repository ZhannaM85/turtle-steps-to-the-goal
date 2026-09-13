import type { Dictionary } from '@/i18n'
import type { DailyEntryPatch } from './mergeDailyEntryPatches'

/** #369 — each source's own data types. All keys selected by default. */
export const ZEPP_LIFE_FIELDS: {
  key: keyof DailyEntryPatch
  label: (t: Dictionary) => string
}[] = [
  { key: 'weightKg', label: (t) => t.dailyEntry.weightLabel },
  { key: 'bodyFatPercent', label: (t) => t.dailyEntry.bodyFatLabel },
  { key: 'bodyWaterPercent', label: (t) => t.dailyEntry.bodyWaterLabel },
  { key: 'boneMassKg', label: (t) => t.dailyEntry.boneMassLabel },
  { key: 'visceralFatRating', label: (t) => t.dailyEntry.visceralFatLabel },
  { key: 'muscleMassKg', label: (t) => t.dailyEntry.muscleMassLabel },
  { key: 'steps', label: (t) => t.dailyEntry.stepsLabel },
]

export const APPLE_HEALTH_FIELDS: {
  key: keyof DailyEntryPatch
  label: (t: Dictionary) => string
}[] = [
  { key: 'weightKg', label: (t) => t.dailyEntry.weightLabel },
  { key: 'bodyFatPercent', label: (t) => t.dailyEntry.bodyFatLabel },
  { key: 'waistCm', label: (t) => t.dailyEntry.waistLabel },
  { key: 'steps', label: (t) => t.dailyEntry.stepsLabel },
  { key: 'waterEntries', label: (t) => t.dailyEntry.waterLabel },
  { key: 'sleepHours', label: (t) => t.dailyEntry.sleepLabel },
  { key: 'deepSleepHours', label: (t) => t.dailyEntry.deepSleepLabel },
  { key: 'onPeriod', label: (t) => t.dailyEntry.onPeriodLabel },
]

/** #367 — meals are this import's payoff; weight is a bonus scalar. */
export const MYFITNESSPAL_FIELDS: {
  key: keyof DailyEntryPatch
  label: (t: Dictionary) => string
}[] = [
  { key: 'calorieEntries', label: (t) => t.dailyEntry.mealsLabel },
  { key: 'weightKg', label: (t) => t.dailyEntry.weightLabel },
]
