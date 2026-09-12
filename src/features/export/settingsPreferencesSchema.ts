import { z } from 'zod'
import { portableDayToggleSchema } from './portableDayToggles'

const trendSeriesVisibleSchema = z.object({
  raw: z.boolean(),
  average: z.boolean(),
})

/** #594 / #861 — Settings-page localStorage prefs (beyond #578 appearance/locale). */
export const settingsPreferencesSchema = z
  .object({
    unit: z.enum(['kg', 'lb']).optional(),
    weekStart: z.enum(['monday', 'firstEntryWeekday']).optional(),
    dayStartTime: z.string().optional(),
    mealSlotDefaultTimes: z
      .object({
        breakfast: z.string(),
        lunch: z.string(),
        snack: z.string(),
        dinner: z.string(),
      })
      .optional(),
    micronutrients: z
      .object({
        sodium: z.boolean().optional(),
        potassium: z.boolean().optional(),
        magnesium: z.boolean().optional(),
      })
      .optional(),
    trackedFields: z
      .object({
        sleep: z.boolean().optional(),
        steps: z.boolean().optional(),
        bodyMeasurements: z.boolean().optional(),
        note: z.boolean().optional(),
        morningNote: z.boolean().optional(),
        mood: z.boolean().optional(),
        bodyComposition: z.boolean().optional(),
        nightEating: z.boolean().optional(),
        dayTotals: z.boolean().optional(),
        fiber: z.boolean().optional(),
        zeppScreenshot: z.boolean().optional(),
        autoSleepScreenshot: z.boolean().optional(),
      })
      .optional(),
    dailyReminder: z.boolean().optional(),
    dailyReminderTime: z.string().optional(),
    trendChartVisible: z
      .object({
        weight: trendSeriesVisibleSchema.partial().optional(),
        calories: trendSeriesVisibleSchema.partial().optional(),
      })
      .optional(),
    profile: z
      .object({
        heightCm: z.number().optional(),
        age: z.number().optional(),
        sex: z.enum(['female', 'male']).optional(),
        activityLevel: z
          .enum(['sedentary', 'light', 'moderate', 'active', 'veryActive'])
          .optional(),
      })
      .optional(),
    mealLabelPresets: z.array(z.string()).optional(),
    customEatingReasons: z.array(z.string()).optional(),
    builtinEatingReasonLabels: z
      .object({
        hunger: z.string().optional(),
        angry: z.string().optional(),
        lonely: z.string().optional(),
        tired: z.string().optional(),
        habit: z.string().optional(),
        craving: z.string().optional(),
        stress: z.string().optional(),
        boredom: z.string().optional(),
        company: z.string().optional(),
      })
      .optional(),
  })
  .extend(portableDayToggleSchema.shape)
