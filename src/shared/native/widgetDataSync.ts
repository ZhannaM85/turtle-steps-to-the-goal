import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { format } from 'date-fns'
import { router } from '@/app'
import { totalCalories } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import { formatExactNumber, formatNumber, getDictionary, unitLabel, useLocaleStore } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalStore, useUnitStore } from '@/stores'

/** Read by `TurtleWidgetProvider.java` from the same SharedPreferences file. */
export const WIDGET_DATA_KEY = 'widgetSnapshot'
/**
 * Written by `MainActivity#handleWidgetTap` when the widget's tap intent
 * (`TurtleWidgetProvider.EXTRA_OPEN_DAY`) arrives, consumed here on the next
 * app-resume. Not a JS-injection call from Java, since `MainActivity` can't
 * know when the WebView has finished loading and this app's own listener is
 * actually attached (a real race on cold start) — `appStateChange` firing
 * with `isActive: true` only ever happens once Capacitor's bridge, and this
 * listener, already exist.
 */
const OPEN_DAY_REQUESTED_KEY = 'widgetOpenDayRequested'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * #606 — the home-screen glance widget lives in a separate native Android
 * process (RemoteViews) and can't reach into the WebView's IndexedDB
 * directly, so this pushes a small pre-formatted snapshot (today's weight,
 * remaining kcal) to native storage whenever relevant data changes.
 * `@capacitor/preferences` is backed by Android SharedPreferences under a
 * fixed `"CapacitorStorage"` file — `TurtleWidgetProvider.java` reads that
 * same file directly, no custom native plugin needed. Values are formatted
 * here (locale + kg/lb unit), not in Java, since the widget has no access
 * to this app's i18n/unit-conversion logic.
 */
export function initWidgetDataSync() {
  if (Capacitor.getPlatform() !== 'android') return

  const sync = () => void syncWidgetSnapshot()
  sync()
  useDailyEntryStore.subscribe(sync)
  useGoalStore.subscribe(sync)
  useUnitStore.subscribe(sync)
  useLocaleStore.subscribe(sync)

  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) void consumeOpenDayRequest()
  })
}

async function consumeOpenDayRequest() {
  const { value } = await Preferences.get({ key: OPEN_DAY_REQUESTED_KEY })
  if (value !== 'true') return
  await Preferences.remove({ key: OPEN_DAY_REQUESTED_KEY })
  void router.navigate('/')
}

async function syncWidgetSnapshot() {
  const date = format(new Date(), 'yyyy-MM-dd')
  const entry = await dailyEntryRepository.getByDate(date)
  const { goal } = useGoalStore.getState()
  const { unit } = useUnitStore.getState()
  const { locale } = useLocaleStore.getState()
  const t = getDictionary(locale)
  const toDisplay = (kg: number) => (unit === 'lb' ? kgToLb(kg) : kg)

  const weightText =
    entry?.weightKg !== undefined
      ? `${formatExactNumber(toDisplay(entry.weightKg), locale)} ${unitLabel(unit, t)}`
      : null

  // Same formula as TodayScreen.tsx's own remainingKcal/consumedKcal.
  const consumedKcal = totalCalories(entry?.calorieEntries, entry?.dayTotals) ?? 0
  const remainingKcal =
    goal?.dailyCalorieTargetKcal !== undefined
      ? goal.dailyCalorieTargetKcal - consumedKcal
      : null
  const remainingKcalText =
    remainingKcal === null
      ? null
      : `${formatNumber(Math.abs(remainingKcal), locale, 0)} ${
          remainingKcal < 0 ? t.today.kcalOverUnit : t.today.kcalRemainingUnit
        }`

  await Preferences.set({
    key: WIDGET_DATA_KEY,
    value: JSON.stringify({ date, weightText, remainingKcalText }),
  })
}
