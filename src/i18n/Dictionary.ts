import type { AboutDict, FeaturesOverviewDict, PrivacyPolicyDict } from './dict/types/about'
import type { DashboardDict } from './dict/types/dashboard'
import type { DailyEntryDict } from './dict/types/dailyEntry'
import type { ExportDict, ExportXlsxDict, PdfSummaryDict, AppleHealthImportDict, MyFitnessPalImportDict, ZeppLifeImportDict } from './dict/types/export'
import type { GoalDict, WeeklyReviewDict } from './dict/types/goal'
import type { HistoryDict } from './dict/types/history'
import type { CustomMetricsDict, NutritionFactsDict, PlannedMealsDict, RecipesDict } from './dict/types/library'
import type { SettingsDict } from './dict/types/settings'
import type { CommonDict, ErrorDict, NavDict, OfflineDict, UpdateDict } from './dict/types/shell'
import type { TodayDict } from './dict/types/today'

export interface Dictionary {
  common: CommonDict
  error: ErrorDict
  update: UpdateDict
  offline: OfflineDict
  nav: NavDict
  today: TodayDict
  dailyEntry: DailyEntryDict
  goal: GoalDict
  weeklyReview: WeeklyReviewDict
  pdfSummary: PdfSummaryDict
  export: ExportDict
  zeppLifeImport: ZeppLifeImportDict
  appleHealthImport: AppleHealthImportDict
  myFitnessPalImport: MyFitnessPalImportDict
  exportXlsx: ExportXlsxDict
  dashboard: DashboardDict
  history: HistoryDict
  settings: SettingsDict
  nutritionFacts: NutritionFactsDict
  recipes: RecipesDict
  customMetrics: CustomMetricsDict
  plannedMeals: PlannedMealsDict
  about: AboutDict
  privacyPolicy: PrivacyPolicyDict
  featuresOverview: FeaturesOverviewDict
}
