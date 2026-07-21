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

function threeWeightEntries(): DailyEntry[] {
  return [
    entry('2026-03-01', { weightKg: 82 }),
    entry('2026-03-02', { weightKg: 81.5 }),
    entry('2026-03-03', { weightKg: 81 }),
  ]
}

describe('WeightTrendChart', () => {
  it('renders nothing when there are no weight entries', () => {
    const { container } = render(<WeightTrendChart entries={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the weight legend when there is enough weight data', () => {
    render(<WeightTrendChart entries={threeWeightEntries()} />, {
      wrapper: MemoryRouter,
    })

    expect(screen.getByText('weight')).toBeInTheDocument()
  })

  it('does not show a projection legend (#46: prognosis line removed)', () => {
    render(<WeightTrendChart entries={threeWeightEntries()} />, {
      wrapper: MemoryRouter,
    })

    expect(screen.queryByText('projected')).not.toBeInTheDocument()
  })

  describe('7-day rolling average overlay (#214)', () => {
    it('shows the rolling-average legend alongside the weight one', () => {
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(screen.getByText('weight')).toBeInTheDocument()
      expect(screen.getByText('7-day average')).toBeInTheDocument()
    })
  })

  describe('not-enough-data gate (#217)', () => {
    it('shows a message instead of the chart with only 1-2 weight entries', () => {
      const entries = [
        entry('2026-03-01', { weightKg: 82 }),
        entry('2026-03-20', { weightKg: 79 }),
      ]
      render(<WeightTrendChart entries={entries} />, { wrapper: MemoryRouter })

      expect(
        screen.getByText(
          'Not enough data yet to show a trend — log a few more days and check back.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('weight')).not.toBeInTheDocument()
    })

    it('renders the full chart once there are at least 3 weight entries', () => {
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.queryByText(
          'Not enough data yet to show a trend — log a few more days and check back.',
        ),
      ).not.toBeInTheDocument()
    })
  })
})
