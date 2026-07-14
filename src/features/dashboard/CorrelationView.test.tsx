import { render, screen } from '@testing-library/react'
import { addDays, format, startOfISOWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { CorrelationView } from './CorrelationView'

function calories(amountKcal: number): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      amountKcal,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

const DATE_FORMAT = 'yyyy-MM-dd'
const WEEK_1_START = format(
  startOfISOWeek(new Date('2026-03-02T00:00:00.000Z')),
  DATE_FORMAT,
)

function weekStart(weekIndex: number): string {
  return format(
    addDays(new Date(`${WEEK_1_START}T00:00:00.000Z`), weekIndex * 7),
    DATE_FORMAT,
  )
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

describe('CorrelationView', () => {
  it('renders nothing when there are no comparable weeks', () => {
    const { container } = render(<CorrelationView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 4 comparable weeks', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1800) }),
    ]
    render(<CorrelationView entries={entries} />)

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }),
      entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }),
      entry(weekStart(3), { weightKg: 85.5, calorieEntries: calories(2200) }),
      entry(weekStart(4), { weightKg: 85.3, calorieEntries: calories(2300) }),
    ]
    render(<CorrelationView entries={entries} />)

    expect(
      screen.getByText(/averaged more loss than weeks/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 4 weeks of data\./)).toBeInTheDocument()
  })
})
