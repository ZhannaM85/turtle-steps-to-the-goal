import { useLocaleStore } from '@/i18n'
import {
  useCycleTrackingStore,
  useDailyReminderStore,
  useDayStartStore,
  useDigestionTrackingStore,
  useMealLabelPresetStore,
  useMealSlotDefaultTimesStore,
  useMicronutrientTrackingStore,
  useProfileStore,
  useTrackedFieldsStore,
  useTrendChartSeriesStore,
  useUnitStore,
  useWaterTrackingStore,
  useWeekStartStore,
} from '@/stores'
import { applyTheme, useThemeStore } from '@/stores/themeStore'
import type { ExportBundle } from './exportBundleSchema'

/** #594 — Settings-page prefs snapshot (optional on the bundle). */
export type ExportSettingsPreferences = NonNullable<ExportBundle['settings']>

/** Collect every Settings-screen preference for a fresh JSON backup (#594). */
export function collectSettingsPreferences(): ExportSettingsPreferences {
  const profile = useProfileStore.getState()
  return {
    unit: useUnitStore.getState().unit,
    weekStart: useWeekStartStore.getState().weekStart,
    dayStartTime: useDayStartStore.getState().dayStartTime,
    mealSlotDefaultTimes: {
      ...useMealSlotDefaultTimesStore.getState().times,
    },
    cycleTracking: useCycleTrackingStore.getState().enabled,
    digestionTracking: useDigestionTrackingStore.getState().enabled,
    waterTracking: useWaterTrackingStore.getState().enabled,
    micronutrients: {
      ...useMicronutrientTrackingStore.getState().tracked,
    },
    trackedFields: {
      ...useTrackedFieldsStore.getState().tracked,
    },
    dailyReminder: useDailyReminderStore.getState().enabled,
    dailyReminderTime: useDailyReminderStore.getState().reminderTime,
    trendChartVisible: {
      weight: { ...useTrendChartSeriesStore.getState().visible.weight },
      calories: { ...useTrendChartSeriesStore.getState().visible.calories },
    },
    profile: {
      heightCm: profile.heightCm,
      age: profile.age,
      sex: profile.sex,
      activityLevel: profile.activityLevel,
    },
    mealLabelPresets: [...useMealLabelPresetStore.getState().presets],
  }
}

/**
 * Apply Settings prefs from a backup when present (#594). Omitted keys /
 * omitted `settings` leave the device's current prefs alone.
 */
export function applySettingsPreferences(
  settings: ExportSettingsPreferences | undefined,
): void {
  if (!settings) return

  if (settings.unit !== undefined) {
    useUnitStore.setState({ unit: settings.unit })
  }
  if (settings.weekStart !== undefined) {
    useWeekStartStore.setState({ weekStart: settings.weekStart })
  }
  if (settings.dayStartTime !== undefined) {
    useDayStartStore.setState({ dayStartTime: settings.dayStartTime })
  }
  if (settings.mealSlotDefaultTimes) {
    useMealSlotDefaultTimesStore
      .getState()
      .setTimes(settings.mealSlotDefaultTimes)
  }
  if (settings.cycleTracking !== undefined) {
    useCycleTrackingStore.setState({ enabled: settings.cycleTracking })
  }
  if (settings.digestionTracking !== undefined) {
    useDigestionTrackingStore.setState({ enabled: settings.digestionTracking })
  }
  if (settings.waterTracking !== undefined) {
    useWaterTrackingStore.setState({ enabled: settings.waterTracking })
  }
  if (settings.micronutrients) {
    useMicronutrientTrackingStore.setState((state) => ({
      tracked: { ...state.tracked, ...settings.micronutrients },
    }))
  }
  if (settings.trackedFields) {
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, ...settings.trackedFields },
    }))
  }
  if (settings.dailyReminder !== undefined) {
    useDailyReminderStore.setState({ enabled: settings.dailyReminder })
  }
  if (settings.dailyReminderTime !== undefined) {
    useDailyReminderStore.setState({
      reminderTime: settings.dailyReminderTime,
    })
  }
  if (settings.trendChartVisible) {
    useTrendChartSeriesStore.setState((state) => ({
      visible: {
        weight: {
          ...state.visible.weight,
          ...settings.trendChartVisible?.weight,
        },
        calories: {
          ...state.visible.calories,
          ...settings.trendChartVisible?.calories,
        },
      },
    }))
  }
  if (settings.profile) {
    useProfileStore.setState({
      heightCm: settings.profile.heightCm,
      age: settings.profile.age,
      sex: settings.profile.sex,
      activityLevel: settings.profile.activityLevel,
    })
  }
  if (settings.mealLabelPresets) {
    useMealLabelPresetStore.setState({
      presets: [...settings.mealLabelPresets],
    })
  }
}

/** #578 appearance + locale — kept separate from `settings` on the wire. */
export function applyAppearanceAndLocale(
  appearance: ExportBundle['appearance'],
  locale: ExportBundle['locale'],
): void {
  if (appearance) {
    const { mood, colorScheme } = appearance
    useThemeStore.setState({ mood, colorScheme })
    applyTheme(mood, colorScheme)
  }
  if (locale) {
    useLocaleStore.getState().setLocale(locale)
  }
}
