import { describe, expect, it } from 'vitest'
import {
  applyPortableDayToggles,
  collectPortableDayToggles,
  PORTABLE_DAY_TOGGLE_KEYS,
  PORTABLE_DAY_TOGGLES,
  portableDayToggleSchema,
} from './portableDayToggles'
import {
  applySettingsPreferences,
  collectSettingsPreferences,
} from './settingsPreferences'
import { settingsPreferencesSchema } from './settingsPreferencesSchema'

describe('portable Day toggles (#861)', () => {
  it('marks every portable toggle on the settings schema', () => {
    const schemaKeys = Object.keys(portableDayToggleSchema.shape)
    expect(schemaKeys).toEqual([...PORTABLE_DAY_TOGGLE_KEYS])
    for (const key of PORTABLE_DAY_TOGGLE_KEYS) {
      expect(settingsPreferencesSchema.shape[key]).toBeDefined()
    }
  })

  it('collects every marked-portable toggle into a fresh settings blob', () => {
    for (const key of PORTABLE_DAY_TOGGLE_KEYS) {
      PORTABLE_DAY_TOGGLES[key].set(true)
    }
    const collected = collectSettingsPreferences()
    for (const key of PORTABLE_DAY_TOGGLE_KEYS) {
      expect(collected[key], `forgotten portable toggle: ${key}`).toBe(true)
    }
    expect(collectPortableDayToggles()).toEqual(
      Object.fromEntries(PORTABLE_DAY_TOGGLE_KEYS.map((key) => [key, true])),
    )
  })

  it('applies a marked-portable toggle including an explicit false', () => {
    for (const key of PORTABLE_DAY_TOGGLE_KEYS) {
      PORTABLE_DAY_TOGGLES[key].set(true)
    }
    applySettingsPreferences({
      alcoholTracking: false,
      eatingReasonTracking: false,
      plannedMealsTracking: true,
      nutritionFacts: false,
      sinceLastMealTimer: true,
      entryComparison: false,
    })
    expect(PORTABLE_DAY_TOGGLES.alcoholTracking.get()).toBe(false)
    expect(PORTABLE_DAY_TOGGLES.eatingReasonTracking.get()).toBe(false)
    expect(PORTABLE_DAY_TOGGLES.plannedMealsTracking.get()).toBe(true)
    expect(PORTABLE_DAY_TOGGLES.nutritionFacts.get()).toBe(false)
    expect(PORTABLE_DAY_TOGGLES.sinceLastMealTimer.get()).toBe(true)
    expect(PORTABLE_DAY_TOGGLES.entryComparison.get()).toBe(false)
    expect(PORTABLE_DAY_TOGGLES.copyYesterdayMeals.get()).toBe(true)
    expect(PORTABLE_DAY_TOGGLES.mealKcalVsYesterday.get()).toBe(true)
  })

  it('leaves omitted portable toggles on the device alone', () => {
    for (const key of PORTABLE_DAY_TOGGLE_KEYS) {
      PORTABLE_DAY_TOGGLES[key].set(true)
    }
    applySettingsPreferences({ unit: 'lb' })
    applyPortableDayToggles({})
    for (const key of PORTABLE_DAY_TOGGLE_KEYS) {
      expect(PORTABLE_DAY_TOGGLES[key].get()).toBe(true)
    }
  })

  it('accepts a settings blob that only names the new #861 keys', () => {
    const parsed = settingsPreferencesSchema.safeParse({
      alcoholTracking: true,
      eatingReasonTracking: true,
      plannedMealsTracking: false,
      nutritionFacts: false,
      sinceLastMealTimer: true,
      entryComparison: false,
      copyYesterdayMeals: true,
      mealKcalVsYesterday: false,
    })
    expect(parsed.success).toBe(true)
  })
})
