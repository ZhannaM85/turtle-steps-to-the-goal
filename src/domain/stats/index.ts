export { weeklySummaries } from './weeklySummaries'
export type { WeeklySummary } from './weeklySummaries'
export { monthlySummaries } from './monthlySummaries'
export type { MonthlySummary } from './monthlySummaries'
export { rollingAverage } from './rollingAverage'
export type { NumericEntryField, RollingAveragePoint } from './rollingAverage'
export { recentAverages } from './recentAverages'
export type { RecentAverages } from './recentAverages'
export { correlation } from './correlation'
export {
  correlationInsight,
  correlationInsightPoints,
  correlationInsightFromPoints,
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
export { foodReactionTallies, mostLikedFoods, mostDislikedFoods } from './foodReactions'
export type { FoodReactionTally } from './foodReactions'
export {
  customChartPoints,
  booleanFlagDates,
  NUMERIC_SERIES_KEYS,
} from './customChartSeries'
export type { CustomChartPoint, NumericSeriesKey } from './customChartSeries'
export { calculateBmi, calculateBmr } from './bodyComposition'
export type { Sex } from './bodyComposition'
export { classifyCorrelationStrength } from './correlationStrength'
export type { CorrelationStrength } from './correlationStrength'
export { outlierBounds, isOutlier, flagOutliers } from './outlierDetection'
export type { OutlierBounds } from './outlierDetection'
export { calculateTdee, suggestDailyTargets } from './targetCalculator'
export type { ActivityLevel, SuggestedDailyTargets } from './targetCalculator'
export {
  BODY_COMPOSITION_SERIES_KEYS,
  bodyCompositionPoints,
} from './bodyCompositionTrend'
export type {
  BodyCompositionPoint,
  BodyCompositionSeriesKey,
} from './bodyCompositionTrend'
export { effectiveDateFor } from './dayStart'
