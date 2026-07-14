import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
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

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('WeightTrendChart', () => {
  it('renders nothing when there are no weight entries', () => {
    const { container } = render(<WeightTrendChart entries={[]} goal={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the weight legend when there is weight data', () => {
    const entries = [entry('2026-03-01', { weightKg: 80 })]
    render(<WeightTrendChart entries={entries} goal={null} />)

    expect(screen.getByText('weight')).toBeInTheDocument()
  })

  it('shows the projection legend only when a goal exists to project from', () => {
    const entries = [entry('2026-03-01', { weightKg: 80 })]

    const { rerender } = render(
      <WeightTrendChart entries={entries} goal={null} />,
    )
    expect(screen.queryByText('projected')).not.toBeInTheDocument()

    rerender(<WeightTrendChart entries={entries} goal={makeGoal()} />)
    expect(screen.getByText('projected')).toBeInTheDocument()
  })
})
