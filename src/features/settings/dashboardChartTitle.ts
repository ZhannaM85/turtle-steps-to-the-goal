import type { Dictionary } from '@/i18n'
import type { DashboardChartKey } from '@/stores'

/** #709 — Dashboard card title for a section key (Settings catalog + tests). */
export function dashboardChartTitle(
  key: DashboardChartKey,
  t: Dictionary,
): string {
  switch (key) {
    case 'weight':
      return t.dashboard.weightTrendTitle
    case 'calories':
      return t.dashboard.calorieTrendTitle
    case 'macros':
      return t.dashboard.macrosTitle
    case 'bodyComposition':
      return t.dashboard.bodyCompositionTrendTitle
    case 'electrolytes':
      return t.dashboard.electrolytesTrendTitle
    case 'customChart':
      return t.dashboard.customChartTitle
    case 'calorieWeightCorrelation':
      return t.dashboard.correlationTitle
    case 'lateMealCorrelation':
      return t.dashboard.lateMealTitle
    case 'mealFrequencyCorrelation':
      return t.dashboard.mealFrequencyTitle
    case 'fastingWindowCorrelation':
      return t.dashboard.fastingWindowTitle
    case 'sleepCorrelation':
      return t.dashboard.sleepCorrelationTitle
    case 'stepsCorrelation':
      return t.dashboard.stepsCorrelationTitle
    case 'proteinCorrelation':
      return t.dashboard.proteinCorrelationTitle
    case 'nightEatingCorrelation':
      return t.dashboard.nightEatingCorrelationTitle
    case 'alcoholCorrelation':
      return t.dashboard.alcoholCorrelationTitle
    case 'foodReactions':
      return t.dashboard.foodReactionsTitle
    case 'loggingConsistency':
      return t.dashboard.loggingConsistencyTitle
    case 'recentAverages':
      return t.dashboard.recentAveragesTitle
    case 'weeklySummary':
      return t.dashboard.weeklySummaryTitle
    case 'monthlySummary':
      return t.dashboard.monthlySummaryTitle
    case 'compareRanges':
      return t.dashboard.compareRangesTitle
  }
}
