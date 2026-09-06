import { format } from 'date-fns'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore } from '@/stores'
import { MealNameFrequencyView } from './MealNameFrequencyView'

let idCounter = 0

function item(): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name: 'Tea', amountKcal: 10 }
}

function entry(date: string, label: string | undefined): DailyEntry {
  idCounter += 1
  const now = `${date}T00:00:00.000Z`
  return {
    id: `entry-${idCounter}`,
    date,
    calorieEntries: [
      {
        id: `meal-${idCounter}`,
        items: [item()],
        createdAt: now,
        label,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

describe('MealNameFrequencyView (#816)', () => {
  afterEach(() => {
    useDashboardChartVisibilityStore.setState((state) => ({
      visible: { ...state.visible, mealNameFrequency: true },
    }))
  })

  it('lists positional defaults and custom labels', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    render(
      <MealNameFrequencyView
        entries={[
          entry(today, undefined),
          entry(today, 'Snack'),
        ]}
      />,
    )
    expect(screen.getByText('Meal names recently')).toBeInTheDocument()
    expect(screen.getAllByText('Breakfast').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Snack').length).toBeGreaterThan(0)
  })
})
