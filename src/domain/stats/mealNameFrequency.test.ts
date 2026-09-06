import { describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { mealNameTallies } from './mealNameFrequency'

let idCounter = 0
const t = getDictionary('en')

function item(): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name: 'Tea', amountKcal: 10 }
}

function entry(
  date: string,
  meals: { label?: string }[],
): DailyEntry {
  idCounter += 1
  const now = `${date}T00:00:00.000Z`
  return {
    id: `entry-${idCounter}`,
    date,
    calorieEntries: meals.map((meal) => {
      idCounter += 1
      return {
        id: `meal-${idCounter}`,
        items: [item()],
        createdAt: now,
        label: meal.label,
      }
    }),
    createdAt: now,
    updatedAt: now,
  }
}

describe('mealNameTallies (#816)', () => {
  it('uses positional defaults when a meal has no custom label', () => {
    const tallies = mealNameTallies([entry('2026-09-01', [{}, {}])], t)
    expect(tallies).toEqual([
      { name: 'Breakfast', count: 1 },
      { name: 'Lunch', count: 1 },
    ])
  })

  it('counts custom labels and ranks by frequency', () => {
    const tallies = mealNameTallies(
      [
        entry('2026-09-01', [{ label: 'Snack' }, { label: 'Snack' }]),
        entry('2026-09-02', [{ label: 'Завтрак' }]),
      ],
      t,
    )
    expect(tallies).toEqual([
      { name: 'Snack', count: 2 },
      { name: 'Завтрак', count: 1 },
    ])
  })
})
