import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { MacroTrendChart } from './MacroTrendChart'

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

describe('MacroTrendChart', () => {
  it('renders nothing when no entry has any macro logged', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          { id: 'c1', amountKcal: 1900, createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
    ]
    const { container } = render(<MacroTrendChart entries={entries} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the title and all three legends when at least one macro is logged', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          {
            id: 'c1',
            amountKcal: 1900,
            proteinG: 90,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ]
    render(<MacroTrendChart entries={entries} />, { wrapper: MemoryRouter })

    expect(
      screen.getByRole('heading', { name: 'Protein, fat & carbs' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Protein')).toBeInTheDocument()
    expect(screen.getByText('Fat')).toBeInTheDocument()
    expect(screen.getByText('Carbs')).toBeInTheDocument()
  })

  it('includes a day that logged only one of the three macros', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          {
            id: 'c1',
            amountKcal: 1900,
            carbsG: 200,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      entry('2026-03-02', {
        calorieEntries: [
          { id: 'c2', amountKcal: 1800, createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
    ]
    // Just confirms it renders without throwing when macro coverage across
    // days is uneven (some days have none at all).
    const { container } = render(<MacroTrendChart entries={entries} />, {
      wrapper: MemoryRouter,
    })
    expect(container).not.toBeEmptyDOMElement()
  })
})
