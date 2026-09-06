import { format } from 'date-fns'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore } from '@/stores'
import { MealTimeBucketsView } from './MealTimeBucketsView'

let idCounter = 0

function item(): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name: 'Tea', amountKcal: 10 }
}

function entry(date: string, timeEaten: string | undefined): DailyEntry {
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
        timeEaten,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

describe('MealTimeBucketsView (#815)', () => {
  afterEach(() => {
    useDashboardChartVisibilityStore.setState((state) => ({
      visible: { ...state.visible, mealTimeBuckets: true },
    }))
  })

  it('shows empty state when no meal has a time', () => {
    render(
      <MealTimeBucketsView
        entries={[entry(format(new Date(), 'yyyy-MM-dd'), undefined)]}
      />,
    )
    expect(screen.getByText('When meals happened')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Nothing to show here yet — keep logging, or widen the date range if you filtered it.',
      ),
    ).toBeInTheDocument()
  })

  it('lists four time buckets and notes meals without a time', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    render(
      <MealTimeBucketsView
        entries={[
          entry(today, '08:00'),
          entry(today, '23:15'),
          entry(today, undefined),
        ]}
      />,
    )
    expect(screen.getAllByText('Morning').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Night').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('1 meal had no time logged.').length,
    ).toBeGreaterThan(0)
  })
})
