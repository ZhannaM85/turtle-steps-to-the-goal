import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { CalorieTrendChart } from './CalorieTrendChart'

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

describe('CalorieTrendChart', () => {
  it('renders nothing when there are no calorie entries', () => {
    const { container } = render(<CalorieTrendChart entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the calorie and rolling-average legends when there is data', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          { id: 'c1', amountKcal: 1900, createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
    ]
    render(<CalorieTrendChart entries={entries} />)

    expect(screen.getByText('calories')).toBeInTheDocument()
    expect(screen.getByText('7-day average')).toBeInTheDocument()
  })
})
