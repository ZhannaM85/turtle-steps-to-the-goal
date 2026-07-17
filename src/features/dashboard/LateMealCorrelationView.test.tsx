import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { LateMealCorrelationView } from './LateMealCorrelationView'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

function mealAt(timeEaten: string): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal: 500 }],
      timeEaten,
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

describe('LateMealCorrelationView', () => {
  it('renders nothing with no comparable day-pairs at all', () => {
    const { container } = render(<LateMealCorrelationView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    render(<LateMealCorrelationView entries={entries} />)

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('collapses the near-empty plot by default with fewer than 8 pairs', async () => {
    const user = userEvent.setup()
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    const { container } = render(<LateMealCorrelationView entries={entries} />)

    expect(container.querySelector('.recharts-wrapper')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show chart' }))

    expect(
      screen.getByRole('button', { name: 'Hide chart' }),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.1, calorieEntries: mealAt('12:30') }),
      entry(day(2), { weightKg: 80.2, calorieEntries: mealAt('13:00') }),
      entry(day(3), { weightKg: 80.25, calorieEntries: mealAt('13:30') }),
      entry(day(4), { weightKg: 80.4, calorieEntries: mealAt('22:00') }),
      entry(day(5), { weightKg: 81.2, calorieEntries: mealAt('22:30') }),
      entry(day(6), { weightKg: 81.9, calorieEntries: mealAt('23:00') }),
      entry(day(7), { weightKg: 82.8, calorieEntries: mealAt('23:30') }),
      entry(day(8), { weightKg: 83.4 }),
    ]
    render(<LateMealCorrelationView entries={entries} />)

    expect(
      screen.getByText(/averaged more weight gain the next morning/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
  })
})
