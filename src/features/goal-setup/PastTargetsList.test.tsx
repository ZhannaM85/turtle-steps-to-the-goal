import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
      metOnDate: '2026-03-12',
    },
    ...overrides,
  }
}

describe('PastTargetsList', () => {
  it('renders nothing when there is no history yet', () => {
    const { container } = render(
      <PastTargetsList records={[]} onDelete={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows each past target's week range, weekly target, and whether it was met", () => {
    render(<PastTargetsList records={[makeRecord()]} onDelete={vi.fn()} />)

    expect(screen.getByText('Past targets')).toBeInTheDocument()
    expect(screen.getByText('Mar 9 – Mar 15')).toBeInTheDocument()
    // Negated (#178) — a loss, matching GoalScreen.tsx's/TodayScreen.tsx's
    // own StatCards ("-0.6 kg to lose").
    expect(screen.getByText('-1.0 kg/week')).toBeInTheDocument()
    // #177: names the day it was reached, not just a binary "Target met".
    expect(screen.getByText('Target met on Mar 12')).toBeInTheDocument()
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
              metOnDate: null,
            },
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Target not met')).toBeInTheDocument()
  })

  it('labels a goal with no computable progress as not enough data', () => {
    render(
      <PastTargetsList
        records={[makeRecord({ progress: null })]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Not enough data to tell')).toBeInTheDocument()
  })

  it('shows a derived range for a legacy goal with no weekStart (#181)', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            goal: {
              id: 'g1',
              targetWeeklyLossKg: 0.6,
              weekStart: undefined,
              createdAt: '2026-07-11T00:00:00.000Z',
              updatedAt: '2026-07-11T00:00:00.000Z',
            },
            progress: null,
            approximateEndDate: '2026-07-18',
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Jul 11 – Jul 18')).toBeInTheDocument()
  })

  it('falls back to a bare single date when there is no approximateEndDate either', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            goal: {
              id: 'g1',
              targetWeeklyLossKg: 0.6,
              weekStart: undefined,
              createdAt: '2026-07-11T00:00:00.000Z',
              updatedAt: '2026-07-11T00:00:00.000Z',
            },
            progress: null,
            approximateEndDate: undefined,
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Jul 11')).toBeInTheDocument()
  })

  describe('deleting a past target (#174)', () => {
    it('asks for confirmation before deleting, and cancel discards it', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      render(<PastTargetsList records={[makeRecord()]} onDelete={onDelete} />)

      await user.click(
        screen.getByRole('button', { name: 'Delete target for Mar 9 – Mar 15' }),
      )
      expect(
        screen.getByText('Delete this target?'),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onDelete).not.toHaveBeenCalled()
      expect(screen.queryByText('Delete this target?')).not.toBeInTheDocument()
    })

    it('calls onDelete with the goal id once confirmed', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      render(<PastTargetsList records={[makeRecord()]} onDelete={onDelete} />)

      await user.click(
        screen.getByRole('button', { name: 'Delete target for Mar 9 – Mar 15' }),
      )
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(onDelete).toHaveBeenCalledWith('g1')
    })
  })
})
