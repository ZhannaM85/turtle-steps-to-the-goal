// Zustand slices, one per feature — UI/session state only, never persisted
// domain data directly (reads/writes go through domain repository interfaces)

export { useGoalStore } from './goalStore'
export { useDailyEntryStore } from './dailyEntryStore'
export { useThemeStore } from './themeStore'
export type { Mood, ColorScheme } from './themeStore'
export { useUnitStore } from './unitStore'
export type { Unit } from './unitStore'
export { useMealItemStore } from './mealItemStore'
export { useGoalCelebrationStore } from './goalCelebrationStore'
export { useCycleTrackingStore } from './cycleTrackingStore'
export { useDigestionTrackingStore } from './digestionTrackingStore'
export { useWeekStartStore } from './weekStartStore'
export type { WeekStart } from './weekStartStore'
export { useFoodOverrideStore } from './foodOverrideStore'
export { useMealLabelPresetStore } from './mealLabelPresetStore'
export { useDailyReminderStore } from './dailyReminderStore'
