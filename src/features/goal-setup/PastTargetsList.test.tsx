import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PastGoalRecord } from '@/domain/goal'
import { PastTargetsList } from './PastTargetsList'

function makeRecord(overrides: Partial<PastGoalRecord> = {}): PastGoalRecord {
  return {
    goal: {
      id: 'g1',
      targetWeeklyLossKg: 1,
      weekStart: '2026-03-09',
      createdAt: '2026-03-09T00:00:00.000Z',
      updatedAt: '2026-03-09T00:00:00.000Z',
    },
    progress: {
      weekStart: '2026-03-09',
      weekEnd: '2026-03-15',
      averageWeightKg: 88,
      priorAverageWeightKg: 90,
      deltaKg: -2,
      targetMet: true,
    },
    ...overrides,
  }
}

describe('PastTargetsList', () => {
  it('renders nothing when there is no history yet', () => {
    const { container } = render(<PastTargetsList records={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows each past target's week range, weekly target, and whether it was met", () => {
    render(<PastTargetsList records={[makeRecord()]} />)

    expect(screen.getByText('Past targets')).toBeInTheDocument()
    expect(screen.getByText('Mar 9 – Mar 15')).toBeInTheDocument()
    // Negated (#178) — a loss, matching GoalScreen.tsx's/TodayScreen.tsx's
    // own StatCards ("-0.6 kg to lose").
    expect(screen.getByText('-1.0 kg/week')).toBeInTheDocument()
    expect(screen.getByText('Target met')).toBeInTheDocument()
  })

  it('labels a missed target', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            progress: {
              weekStart: '2026-03-09',
              weekEnd: '2026-03-15',
              averageWeightKg: 89.5,
              priorAverageWeightKg: 90,
              deltaKg: -0.5,
              targetMet: false,
            },
          }),
        ]}
      />,
    )

    expect(screen.getByText('Target not met')).toBeInTheDocument()
  })

  it('labels a goal with no computable progress as not enough data', () => {
    render(<PastTargetsList records={[makeRecord({ progress: null })]} />)

    expect(screen.getByText('Not enough data to tell')).toBeInTheDocument()
  })
})
