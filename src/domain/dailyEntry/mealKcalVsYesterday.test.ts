import { describe, expect, it } from 'vitest'
import {
  mealKcalDeltasByLabel,
  mealKcalDeltasVsLastSameLabel,
} from './mealKcalVsYesterday'

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

describe('mealKcalDeltasVsLastSameLabel (#977)', () => {
  const before = '2026-09-22'

  it('uses yesterday when that day has the same meal', () => {
    expect(
      mealKcalDeltasVsLastSameLabel(
        [{ label: 'Завтрак', kcal: 140 }],
        [
          {
            date: '2026-09-19',
            meals: [{ label: 'Завтрак', kcal: 200 }],
          },
          {
            date: '2026-09-21',
            meals: [{ label: 'Завтрак', kcal: 180 }],
          },
        ],
        before,
      ),
    ).toEqual([{ delta: -40, baselineDate: '2026-09-21' }])
  })

  it('uses the latest earlier day when yesterday has no meal of that label', () => {
    expect(
      mealKcalDeltasVsLastSameLabel(
        [{ label: 'Завтрак', kcal: 140 }],
        [
          {
            date: '2026-09-19',
            meals: [{ label: 'Завтрак', kcal: 200 }],
          },
          {
            date: '2026-09-21',
            meals: [{ label: 'Обед', kcal: 500 }],
          },
        ],
        before,
      ),
    ).toEqual([{ delta: -60, baselineDate: '2026-09-19' }])
  })

  it('omits the delta when that meal was never logged before', () => {
    expect(
      mealKcalDeltasVsLastSameLabel(
        [{ label: 'Завтрак', kcal: 140 }],
        [
          {
            date: '2026-09-21',
            meals: [{ label: 'Обед', kcal: 0 }],
          },
        ],
        before,
      ),
    ).toEqual([{ delta: null, baselineDate: null }])
  })

  it('does not treat a missing meal as zero and ignores the viewed day', () => {
    expect(
      mealKcalDeltasVsLastSameLabel(
        [{ label: 'Завтрак', kcal: 140 }],
        [
          { date: '2026-09-22', meals: [{ label: 'Завтрак', kcal: 90 }] },
          { date: '2026-09-23', meals: [{ label: 'Завтрак', kcal: 50 }] },
        ],
        before,
      ),
    ).toEqual([{ delta: null, baselineDate: null }])
  })

  it('picks a different baseline day per label', () => {
    expect(
      mealKcalDeltasVsLastSameLabel(
        [
          { label: 'Завтрак', kcal: 140 },
          { label: 'Обед', kcal: 400 },
        ],
        [
          {
            date: '2026-09-19',
            meals: [{ label: 'Завтрак', kcal: 200 }],
          },
          {
            date: '2026-09-21',
            meals: [{ label: 'Обед', kcal: 450 }],
          },
        ],
        before,
      ),
    ).toEqual([
      { delta: -60, baselineDate: '2026-09-19' },
      { delta: -50, baselineDate: '2026-09-21' },
    ])
  })

  it('does not reach past the latest day to match a later duplicate', () => {
    expect(
      mealKcalDeltasVsLastSameLabel(
        [
          { label: 'Обед', kcal: 400 },
          { label: 'Обед', kcal: 300 },
        ],
        [
          {
            date: '2026-09-19',
            meals: [
              { label: 'Обед', kcal: 500 },
              { label: 'Обед', kcal: 350 },
            ],
          },
          {
            date: '2026-09-21',
            meals: [{ label: 'Обед', kcal: 480 }],
          },
        ],
        before,
      ),
    ).toEqual([
      { delta: -80, baselineDate: '2026-09-21' },
      { delta: null, baselineDate: null },
    ])
  })

  it('hides the line when kcal is unchanged on the baseline day', () => {
    expect(
      mealKcalDeltasVsLastSameLabel(
        [{ label: 'Завтрак', kcal: 140 }],
        [
          {
            date: '2026-09-19',
            meals: [{ label: 'Завтрак', kcal: 140 }],
          },
        ],
        before,
      ),
    ).toEqual([{ delta: null, baselineDate: null }])
  })
})
