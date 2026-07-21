import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { ProteinCorrelationView } from './ProteinCorrelationView'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

function protein(proteinG: number): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal: 100, proteinG }],
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

describe('ProteinCorrelationView', () => {
  it('renders nothing with no comparable day-pairs at all', () => {
    const { container } = render(<ProteinCorrelationView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: protein(70) }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    render(<ProteinCorrelationView entries={entries} />)

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('collapses the near-empty plot by default with fewer than 8 pairs', async () => {
    const user = userEvent.setup()
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: protein(70) }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    const { container } = render(<ProteinCorrelationView entries={entries} />)

    expect(container.querySelector('.recharts-wrapper')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show chart' }))

    expect(
      screen.getByRole('button', { name: 'Hide chart' }),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: protein(40) }),
      entry(day(1), { weightKg: 80.8, calorieEntries: protein(45) }),
      entry(day(2), { weightKg: 81.7, calorieEntries: protein(50) }),
      entry(day(3), { weightKg: 82.5, calorieEntries: protein(55) }),
      entry(day(4), { weightKg: 82.6, calorieEntries: protein(100) }),
      entry(day(5), { weightKg: 82.65, calorieEntries: protein(105) }),
      entry(day(6), { weightKg: 82.75, calorieEntries: protein(110) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: protein(115) }),
      entry(day(8), { weightKg: 82.85 }),
    ]
    render(<ProteinCorrelationView entries={entries} />)

    expect(
      screen.getByText(/averaged more weight gain the next morning/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
  })
})
