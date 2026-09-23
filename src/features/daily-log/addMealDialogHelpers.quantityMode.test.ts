import { describe, expect, it } from 'vitest'
import {
  applyManualDraftModeChange,
  draftFromCalorieItem,
} from './addMealDialogHelpers'

describe('draftFromCalorieItem (#981)', () => {
  it('opens a logged portion on the 100g tab with per-100g rates', () => {
    const draft = draftFromCalorieItem({
      id: 'jam',
      name: 'Pear banana jam',
      brand: 'Maheev',
      amountKcal: 136,
      carbsG: 34,
      amountG: 50,
    })

    expect(draft.macroMode).toBe('per100g')
    expect(draft.amount).toBe('272')
    expect(draft.carbs).toBe('68')
    expect(draft.amountG).toBe('0.5')
    expect(draft.brand).toBe('Maheev')
  })

  it('keeps portion weight and kcal when the user switches to Portion', () => {
    const opened = draftFromCalorieItem({
      id: 'jam',
      name: 'Pear banana jam',
      amountKcal: 136,
      carbsG: 34,
      amountG: 50,
    })
    const switched = applyManualDraftModeChange(opened, 'perPortion')

    expect(switched.draft.macroMode).toBe('perPortion')
    expect(switched.draft.amount).toBe('136')
    expect(switched.draft.carbs).toBe('34')
    expect(switched.draft.amountG).toBe('50')
    expect(switched.portionScaleBase?.grams).toBe(50)
  })
})
