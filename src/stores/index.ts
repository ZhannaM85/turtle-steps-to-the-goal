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
export { useWaterTrackingStore } from './waterTrackingStore'
export {
  useMicronutrientTrackingStore,
  type MicronutrientField,
} from './micronutrientTrackingStore'
export { useWeekStartStore } from './weekStartStore'
export { useDashboardPeriodStore } from './dashboardPeriodStore'
export type {
  ChartPeriodSelection,
  DashboardPeriodChartKey,
} from './dashboardPeriodStore'
export {
  DASHBOARD_PERIOD_CHART_KEYS,
  isDashboardPeriodChartKey,
} from './dashboardPeriodStore'
export type { WeekStart } from './weekStartStore'
export { useFoodOverrideStore } from './foodOverrideStore'
export { useMealLabelPresetStore } from './mealLabelPresetStore'
export { useDailyReminderStore } from './dailyReminderStore'
export { useCustomChartSelectionStore } from './customChartSelectionStore'
export type { ChartSeriesType } from './customChartSelectionStore'
export { useTrendChartSeriesStore } from './trendChartSeriesStore'
export type { TrendChartKey, TrendSeriesKey } from './trendChartSeriesStore'
export { useDashboardChartVisibilityStore } from './dashboardChartVisibilityStore'
export type { DashboardChartKey } from './dashboardChartVisibilityStore'
export { useTrackedFieldsStore } from './trackedFieldsStore'
export type { TrackedField } from './trackedFieldsStore'
export { useSectionVisibilityStore } from './sectionVisibilityStore'
export type { SectionKey } from './sectionVisibilityStore'
export { useProfileStore } from './profileStore'
export type { ActivityLevel, Sex } from './profileStore'
export { useBodyCompositionSelectionStore } from './bodyCompositionSelectionStore'
export {
  MACRO_SERIES_KEYS,
  useMacroChartSelectionStore,
  type MacroSeriesKey,
} from './macroChartSelectionStore'
export { useOutlierExclusionStore } from './outlierExclusionStore'
export { useRecipeStore } from './recipeStore'
export {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  useDashboardSectionOrderStore,
} from './dashboardSectionOrderStore'
export { useDayStartStore } from './dayStartStore'
export { useMealSlotDefaultTimesStore } from './mealSlotDefaultTimesStore'
export {
  DEFAULT_TODAY_CARD_ORDER,
  useTodayCardOrderStore,
  type TodayCardKey,
} from './todayCardOrderStore'
export {
  anyTodaySectionExpanded,
  TODAY_SECTION_KEYS,
  useTodaySectionsCollapseStore,
  type TodaySectionKey,
} from './todaySectionsCollapseStore'
export { useCustomMetricStore } from './customMetricStore'
export { useCustomCorrelationStore } from './customCorrelationStore'
export { useWeeklyNoteStore } from './weeklyNoteStore'
export { useCalendarMarkerVisibilityStore } from './calendarMarkerVisibilityStore'
export type { CalendarMarkerKey } from './calendarMarkerVisibilityStore'
export { useAddMealRecentVisibilityStore } from './addMealRecentVisibilityStore'
export { useLastBackupStore } from './lastBackupStore'
