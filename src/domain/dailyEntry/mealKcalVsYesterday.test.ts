import { describe, expect, it } from 'vitest'
import { mealKcalDeltasByLabel } from './mealKcalVsYesterday'

describe('mealKcalDeltasByLabel (#836)', () => {
  it('pairs meals with the same label and returns today minus yesterday', () => {
    expect(
      mealKcalDeltasByLabel(
        [
          { label: 'Lunch', kcal: 500 },
          { label: 'Dinner', kcal: 800 },
        ],
        [
          { label: 'Lunch', kcal: 550 },
          { label: 'Dinner', kcal: 700 },
        ],
      ),
    ).toEqual([-50, 100])
  })

  it('matches custom labels independently of other meals (Обед два)', () => {
    expect(
      mealKcalDeltasByLabel(
        [
          { label: 'Обед', kcal: 400 },
          { label: 'Обед два', kcal: 350 },
        ],
        [
          { label: 'Обед', kcal: 500 },
          { label: 'Обед два', kcal: 350 },
        ],
      ),
    ).toEqual([-100, null])
  })

  it('returns null when yesterday has no meal with that label', () => {
    expect(
      mealKcalDeltasByLabel(
        [{ label: 'Lunch', kcal: 500 }],
        [{ label: 'Breakfast', kcal: 400 }],
      ),
    ).toEqual([null])
  })

  it('pairs duplicate labels in appearance order', () => {
    expect(
      mealKcalDeltasByLabel(
        [
          { label: 'Lunch', kcal: 400 },
          { label: 'Lunch', kcal: 600 },
        ],
        [
          { label: 'Lunch', kcal: 500 },
          { label: 'Lunch', kcal: 500 },
        ],
      ),
    ).toEqual([-100, 100])
  })

  it('leaves a later duplicate unmatched when yesterday only has one', () => {
    expect(
      mealKcalDeltasByLabel(
        [
          { label: 'Lunch', kcal: 400 },
          { label: 'Lunch', kcal: 600 },
        ],
        [{ label: 'Lunch', kcal: 500 }],
      ),
    ).toEqual([-100, null])
  })

  it('returns null when kcal is unchanged', () => {
    expect(
      mealKcalDeltasByLabel(
        [{ label: 'Dinner', kcal: 700 }],
        [{ label: 'Dinner', kcal: 700 }],
      ),
    ).toEqual([null])
  })
})
