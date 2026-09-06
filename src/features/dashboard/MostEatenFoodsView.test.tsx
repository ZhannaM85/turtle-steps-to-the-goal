import { format, subDays } from 'date-fns'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore } from '@/stores'
import { MostEatenFoodsView } from './MostEatenFoodsView'

let idCounter = 0

function item(name: string, amountKcal = 100): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name, amountKcal }
}

function entry(date: string, items: CalorieItem[]): DailyEntry {
  idCounter += 1
  const now = `${date}T00:00:00.000Z`
  return {
    id: `entry-${idCounter}`,
    date,
    calorieEntries: [{ id: `meal-${idCounter}`, items, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  }
}

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

describe('MostEatenFoodsView (#812)', () => {
  afterEach(() => {
    useDashboardChartVisibilityStore.setState((state) => ({
      visible: { ...state.visible, mostEatenRecently: true },
    }))
  })

  it('shows empty state when no named dishes were logged in the windows', () => {
    render(
      <MostEatenFoodsView
        entries={[entry(todayIso(), [item('', 200)])]}
      />,
    )
    expect(screen.getByText('Most eaten recently')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Nothing to show here yet — keep logging, or widen the date range if you filtered it.',
      ),
    ).toBeInTheDocument()
  })

  it('lists dishes from the last 7 and 30 days with counts', () => {
    const recent = todayIso()
    const old = format(subDays(new Date(), 40), 'yyyy-MM-dd')
    render(
      <MostEatenFoodsView
        entries={[
          entry(recent, [item('Milk'), item('Milk'), item('Napoleon')]),
          entry(old, [item('Old soup')]),
        ]}
      />,
    )
    expect(screen.getAllByText('Milk').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Napoleon').length).toBeGreaterThan(0)
    expect(screen.queryByText('Old soup')).not.toBeInTheDocument()
  })

  it('hides the card body but keeps the title (#232)', async () => {
    const user = userEvent.setup()
    render(
      <MostEatenFoodsView entries={[entry(todayIso(), [item('Milk')])]} />,
    )
    const title = 'Most eaten recently'
    await user.click(screen.getByRole('button', { name: `Hide ${title}` }))
    expect(screen.queryByText('Milk')).not.toBeInTheDocument()
    expect(screen.getByText(title)).toBeInTheDocument()
  })
})
