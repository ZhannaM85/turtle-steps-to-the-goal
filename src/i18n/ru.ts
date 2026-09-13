import type { Dictionary } from './Dictionary'
import { about, featuresOverview, privacyPolicy } from './dict/ru/about'
import { dashboard } from './dict/ru/dashboard'
import { dailyEntry } from './dict/ru/dailyEntry'
import {
  appleHealthImport,
  exportCopy,
  exportXlsx,
  myFitnessPalImport,
  pdfSummary,
  zeppLifeImport,
} from './dict/ru/export'
import { goal, weeklyReview } from './dict/ru/goal'
import { history } from './dict/ru/history'
import {
  customMetrics,
  nutritionFacts,
  plannedMeals,
  recipes,
} from './dict/ru/library'
import { settings } from './dict/ru/settings'
import { common, error, nav, offline, update } from './dict/ru/shell'
import { today } from './dict/ru/today'

export const ru: Dictionary = {
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
