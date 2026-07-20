import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { MonthlySummaryCards } from './MonthlySummaryCards'

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

describe('MonthlySummaryCards', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<MonthlySummaryCards entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a dash for the first month (no prior month to compare)', () => {
    const entries = [entry('2026-03-05', { weightKg: 80 })]
    render(<MonthlySummaryCards entries={entries} />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('March 2026')).toBeInTheDocument()
  })

  it('shows the signed delta and average calories for a second month', () => {
    const entries = [
      entry('2026-03-05', { weightKg: 82, calorieEntries: calories(2000) }),
      entry('2026-04-05', { weightKg: 80, calorieEntries: calories(1800) }),
    ]
    render(<MonthlySummaryCards entries={entries} />)

    expect(screen.getByText('-2.0')).toBeInTheDocument()
    expect(screen.getByText(/Average calories: 1,800|1800/)).toBeInTheDocument()
  })

  it("renders a loss month with the card's full bold treatment", () => {
    const entries = [
      entry('2026-03-05', { weightKg: 82 }),
      entry('2026-04-05', { weightKg: 80 }),
    ]
    render(<MonthlySummaryCards entries={entries} />)

    expect(screen.getByText('-2.0')).toHaveClass('text-4xl', 'font-semibold')
  })

  it('renders a gain month visually quieter, with no explicit plus sign', () => {
    const entries = [
      entry('2026-03-05', { weightKg: 80 }),
      entry('2026-04-05', { weightKg: 80.6 }),
    ]
    render(<MonthlySummaryCards entries={entries} />)

    expect(screen.queryByText('+0.6')).not.toBeInTheDocument()
    expect(screen.getByText('0.6')).toHaveClass(
      'text-2xl',
      'font-normal',
      'text-muted-foreground',
    )
  })

  it('shows the average macros for a month alongside average calories (#53 reasoning)', () => {
    const entries = [
      entry('2026-03-05', {
        weightKg: 80,
        calorieEntries: calories(2000, { proteinG: 100, fatG: 60 }),
      }),
    ]
    render(<MonthlySummaryCards entries={entries} />)

    expect(
      screen.getByText(
        'Average calories: 2,000 · Protein 100g · Fat 60g · Carbs —',
      ),
    ).toBeInTheDocument()
  })

  it('never shows a target-met note — months have no goal concept to compare against', () => {
    const entries = [
      entry('2026-03-05', { weightKg: 82 }),
      entry('2026-04-05', { weightKg: 75 }),
    ]
    render(<MonthlySummaryCards entries={entries} />)

    expect(screen.queryByText(/target met/)).not.toBeInTheDocument()
  })

  it('lists months most-recent-first', () => {
    const entries = [
      entry('2026-03-05', { weightKg: 82 }),
      entry('2026-04-05', { weightKg: 80 }),
    ]
    render(<MonthlySummaryCards entries={entries} />)

    const labels = screen.getAllByText(/^(March|April) 2026$/)
    expect(labels.map((el) => el.textContent)).toEqual([
      'April 2026',
      'March 2026',
    ])
  })
})
