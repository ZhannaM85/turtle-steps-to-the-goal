import type { Dictionary } from './Dictionary'
import { about, featuresOverview, privacyPolicy } from './dict/en/about'
import { dashboard } from './dict/en/dashboard'
import { dailyEntry } from './dict/en/dailyEntry'
import {
  appleHealthImport,
  exportCopy,
  exportXlsx,
  myFitnessPalImport,
  pdfSummary,
  zeppLifeImport,
} from './dict/en/export'
import { goal, weeklyReview } from './dict/en/goal'
import { history } from './dict/en/history'
import {
  customMetrics,
  nutritionFacts,
  plannedMeals,
  recipes,
} from './dict/en/library'
import { settings } from './dict/en/settings'
import { common, error, nav, offline, update } from './dict/en/shell'
import { today } from './dict/en/today'

export const en: Dictionary = {
  common,
  error,
  update,
  offline,
  nav,
  today,
  dailyEntry,
  goal,
  weeklyReview,
  pdfSummary,
  export: exportCopy,
  zeppLifeImport,
  appleHealthImport,
  myFitnessPalImport,
  exportXlsx,
  dashboard,
  history,
  settings,
  nutritionFacts,
  recipes,
  customMetrics,
  plannedMeals,
  about,
  privacyPolicy,
  featuresOverview,
}
