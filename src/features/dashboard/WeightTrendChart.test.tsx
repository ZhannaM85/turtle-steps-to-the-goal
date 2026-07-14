import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { WeightTrendChart } from './WeightTrendChart'

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

describe('WeightTrendChart', () => {
  it('renders nothing when there are no weight entries', () => {
    const { container } = render(<WeightTrendChart entries={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the weight legend when there is weight data', () => {
    const entries = [entry('2026-03-01', { weightKg: 80 })]
    render(<WeightTrendChart entries={entries} />, {
      wrapper: MemoryRouter,
    })

    expect(screen.getByText('weight')).toBeInTheDocument()
  })

  it('does not show a projection legend (#46: prognosis line removed)', () => {
    const entries = [entry('2026-03-01', { weightKg: 80 })]
    render(<WeightTrendChart entries={entries} />, { wrapper: MemoryRouter })

    expect(screen.queryByText('projected')).not.toBeInTheDocument()
  })
})
