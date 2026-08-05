export {
  weeklySummaries,
  isCompletedCalendarWeek,
  excludeIncompleteCurrentWeek,
} from './weeklySummaries'
export type { WeeklySummary } from './weeklySummaries'
export { monthlySummaries } from './monthlySummaries'
export type { MonthlySummary } from './monthlySummaries'
export { rollingAverage } from './rollingAverage'
export type { NumericEntryField, RollingAveragePoint } from './rollingAverage'
export { recentAverages, recentAverageWindowRange } from './recentAverages'
export type {
  RecentAverages,
  RecentAverageWindowRange,
} from './recentAverages'
export { correlation } from './correlation'
export {
  correlationInsight,
  correlationInsightPoints,
  correlationInsightFromPoints,
  weeklyCorrelationExcludesCurrentWeek,
} from './correlationInsight'
export type {
  CorrelationInsight,
  CorrelationInsightPoint,
} from './correlationInsight'
export {
  lateMealCorrelation,
  lateMealCorrelationFromPoints,
  lateMealPoints,
} from './lateMealCorrelation'
export type { LateMealCorrelation, LateMealPoint } from './lateMealCorrelation'
export {
  mealFrequencyCorrelation,
  mealFrequencyCorrelationFromPoints,
  mealFrequencyPoints,
} from './mealFrequencyCorrelation'
export type {
  MealFrequencyCorrelation,
  MealFrequencyPoint,
} from './mealFrequencyCorrelation'
export {
  nightEatingCorrelation,
  nightEatingCorrelationFromPoints,
  nightEatingPoints,
} from './nightEatingCorrelation'
export type {
  NightEatingCorrelation,
  NightEatingPoint,
} from './nightEatingCorrelation'
export {
  fastingWindowPoints,
  fastingWindowCorrelation,
  fastingWindowCorrelationFromPoints,
  fastingHoursBetween,
} from './fastingWindow'
export type { FastingWindowPoint, FastingWindowCorrelation } from './fastingWindow'
export {
  sleepCorrelation,
  sleepCorrelationFromPoints,
  sleepPoints,
} from './sleepCorrelation'
export type { SleepCorrelation, SleepPoint } from './sleepCorrelation'
export {
  stepsCorrelation,
  stepsCorrelationFromPoints,
  stepsPoints,
} from './stepsCorrelation'
export type { StepsCorrelation, StepsPoint } from './stepsCorrelation'
export {
  proteinCorrelation,
  proteinCorrelationFromPoints,
  proteinPoints,
} from './proteinCorrelation'
export type { ProteinCorrelation, ProteinPoint } from './proteinCorrelation'
export { loggingConsistencyWeeks, MAX_LOGGING_SIGNALS } from './loggingConsistency'
export type {
  LoggingConsistencyDay,
  LoggingConsistencyWeek,
} from './loggingConsistency'
export { loggingConsistencySummary } from './loggingConsistencySummary'
export type { LoggingConsistencySummary } from './loggingConsistencySummary'
export { dateRangeSummary } from './dateRangeSummary'
export type { DateRangeSummary } from './dateRangeSummary'
export {
  resolveTrendChartPeriodRange,
  filterEntriesByTrendChartPeriod,
  isPageableTrendChartPeriod,
  ROLLING_WINDOW_DAYS,
} from './trendChartPeriod'
export type {
  TrendChartPeriod,
  TrendChartPeriodRange,
} from './trendChartPeriod'
export {
  CHART_ZOOM_MIN_SPAN,
  clampZoomWindow,
  zoomWindowByScale,
  panZoomWindow,
  sliceByZoomWindow,
} from './chartGestureZoom'
export type { ChartZoomWindow } from './chartGestureZoom'
export {
  SCATTER_ZOOM_MIN_FRACTION,
  SCATTER_ZOOM_MIN_POINTS,
  scatterDomainFromValues,
  clampScatterDomain,
  zoomScatterDomainByScale,
  panScatterDomain,
} from './scatterGestureZoom'
export type { ScatterZoomDomain } from './scatterGestureZoom'
export { foodReactionTallies, mostLikedFoods, mostDislikedFoods } from './foodReactions'
export type { FoodReactionTally } from './foodReactions'
export {
  customChartPoints,
  booleanFlagDates,
  booleanFlagMarkers,
  numericSeriesValueByDate,
  NUMERIC_SERIES_KEYS,
} from './customChartSeries'
export type {
  BooleanFlagMarker,
  CustomChartPoint,
  NumericSeriesKey,
} from './customChartSeries'
export { calculateBmi, calculateBmr } from './bodyComposition'
export type { Sex } from './bodyComposition'
export {
  classifyCorrelationStrength,
  classifyRelativeCorrelationStrength,
} from './correlationStrength'
export type { CorrelationStrength } from './correlationStrength'
export {
  resolveMetricValueMap,
  pointsFromValueMaps,
  customCorrelationPoints,
  customCorrelationFromPoints,
  customCorrelationInsight,
} from './customCorrelationEngine'
export type {
  MetricValuePoint,
  CustomCorrelationResult,
} from './customCorrelationEngine'
export {
  outlierBounds,
  isOutlier,
  flagOutliers,
  classifyOutlierAxes,
} from './outlierDetection'
export type { OutlierBounds, OutlierAxes } from './outlierDetection'
export {
  calculateTdee,
  suggestDailyTargets,
  suggestedFiberTargetG,
  suggestMacrosForCalorieTarget,
  estimateWeeklyLossKgFromCalorieTarget,
  weeklyPaceDisagreesWithCalorieImpliedPace,
} from './targetCalculator'
export type {
  ActivityLevel,
  SuggestedDailyTargets,
} from './targetCalculator'
export {
  recommendedWaterMlRange,
  adjustWaterMlRange,
  waterRecommendationMidMl,
  WATER_HOT_DAY_BUMP_ML,
  WATER_WORKOUT_BUMP_ML,
  WATER_ML_PER_KG_LOW,
  WATER_ML_PER_KG_HIGH,
} from './waterRecommendation'
export type {
  WaterRecommendationRange,
  WaterRecommendationAdjustments,
} from './waterRecommendation'
export {
  BODY_COMPOSITION_SERIES_KEYS,
  bodyCompositionPoints,
} from './bodyCompositionTrend'
export type {
  BodyCompositionPoint,
  BodyCompositionSeriesKey,
} from './bodyCompositionTrend'
export {
  ELECTROLYTE_SERIES_KEYS,
  electrolytePoints,
} from './electrolyteTrend'
export type {
  ElectrolytePoint,
  ElectrolyteSeriesKey,
} from './electrolyteTrend'
export { effectiveDateFor } from './dayStart'
