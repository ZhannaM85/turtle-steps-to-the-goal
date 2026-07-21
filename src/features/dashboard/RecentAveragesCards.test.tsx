import { format, subDays } from 'date-fns'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { RecentAveragesCards } from './RecentAveragesCards'

function calories(
  amountKcal: number,
  macros: Partial<CalorieItem> = {},
): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal, ...macros }],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

let idCounter = 0
function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function daysAgo(n: number): string {
  return format(subDays(new Date(), n), 'yyyy-MM-dd')
}

describe('RecentAveragesCards', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<RecentAveragesCards entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when nothing was logged within either window', () => {
    const entries = [entry(daysAgo(60), { calorieEntries: calories(2000) })]
    const { container } = render(<RecentAveragesCards entries={entries} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows separate 7-day and 30-day average calorie cards', () => {
    const entries = [
      entry(daysAgo(1), { calorieEntries: calories(2000) }),
      entry(daysAgo(20), { calorieEntries: calories(1000) }),
    ]
    render(<RecentAveragesCards entries={entries} />)

    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('2,000')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('shows the average protein alongside average calories', () => {
    const entries = [
      entry(daysAgo(1), {
        calorieEntries: calories(2000, { proteinG: 100 }),
      }),
    ]
    render(<RecentAveragesCards entries={entries} />)

    // Appears in both the 7-day and 30-day cards, since a day 1 day back
    // falls within both windows.
    expect(screen.getAllByText('Protein: 100g')).toHaveLength(2)
  })

  it('only shows the 30-day card when the 7-day window has no data', () => {
    const entries = [entry(daysAgo(20), { calorieEntries: calories(1500) })]
    render(<RecentAveragesCards entries={entries} />)

    expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })
})
