import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { BUILTIN_MEAL_SLOT_DEFAULT_TIMES } from '@/shared/lib/mealLabel'
import {
  countUntimedSlotMeals,
  stampSlotDefaultsOnUntimedMeals,
} from './stampSlotDefaultTimes'

function entry(
  id: string,
  meals: NonNullable<DailyEntry['calorieEntries']>,
): DailyEntry {
  return {
    id,
    date: '2026-01-01',
    calorieEntries: meals,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('stampSlotDefaultsOnUntimedMeals (#595)', () => {
  it('stamps known slot labels that have no timeEaten', () => {
    const prefs = {
      breakfast: '12:00',
      lunch: '15:00',
      dinner: '21:00',
      snack: '18:00',
    }
    const result = stampSlotDefaultsOnUntimedMeals(
      [
        entry('a', [
          {
            id: 'm1',
            items: [{ id: 'i1', amountKcal: 100 }],
            label: 'Breakfast',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'm2',
            items: [{ id: 'i2', amountKcal: 200 }],
            label: 'Dinner',
            timeEaten: '20:00',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
      ],
      prefs,
    )

    expect(result.mealCount).toBe(1)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].calorieEntries?.[0].timeEaten).toBe('12:00')
    expect(result.entries[0].calorieEntries?.[1].timeEaten).toBe('20:00')
  })

  it('leaves unknown labels and timed meals alone', () => {
    const result = stampSlotDefaultsOnUntimedMeals(
      [
        entry('a', [
          {
            id: 'm1',
            items: [{ id: 'i1', amountKcal: 100 }],
            label: 'Brunch',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
      ],
      BUILTIN_MEAL_SLOT_DEFAULT_TIMES,
    )
    expect(result.mealCount).toBe(0)
    expect(result.entries).toEqual([])
  })

  it('countUntimedSlotMeals matches stamp candidates', () => {
    const entries = [
      entry('a', [
        {
          id: 'm1',
          items: [{ id: 'i1', amountKcal: 100 }],
          label: 'Lunch',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'm2',
          items: [{ id: 'i2', amountKcal: 100 }],
          label: 'Snacks',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    ]
    expect(countUntimedSlotMeals(entries)).toBe(2)
  })
})
