import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PastGoalRecord } from '@/domain/goal'
import { formatLocalizedDate, useLocaleStore } from '@/i18n'
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
      targetMet: true,
      metOnDate: '2026-03-12',
      finalTargetMet: true,
    },
    ...overrides,
  }
}

describe('PastTargetsList', () => {
  afterEach(() => {
    useLocaleStore.setState({ locale: 'en' })
  })

  it('renders nothing when there is no history yet', () => {
    const { container } = render(
      <PastTargetsList records={[]} onDelete={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows each past target's week range, weekly target, and whether it was met", () => {
    render(<PastTargetsList records={[makeRecord()]} onDelete={vi.fn()} />)

    expect(screen.getByText('Past targets')).toBeInTheDocument()
    expect(screen.getByText('Mar 9, 2026 – Mar 15, 2026')).toBeInTheDocument()
    // #527 — positive magnitude (how much to lose), not a leading minus.
    // #586 — formatExactNumber: whole numbers stay "1", not "1.0".
    expect(screen.getByText('1 kg/week')).toBeInTheDocument()
    // #972: status date is weekEnd (Mar 15), not metOnDate (Mar 12).
    expect(screen.getByText('Target met on Mar 15, 2026')).toBeInTheDocument()
    expect(
      screen.queryByText('Target met on Mar 12, 2026'),
    ).not.toBeInTheDocument()
  })

  it('shows week end as the reached status date when the target was met mid-week (#972)', () => {
    useLocaleStore.setState({ locale: 'ru' })
    render(
      <PastTargetsList
        records={[
          makeRecord({
            goal: {
              id: 'g1',
              targetWeeklyLossKg: 0.1,
              weekStart: '2026-09-14',
              weekEnd: '2026-09-20',
              createdAt: '2026-09-14T00:00:00.000Z',
              updatedAt: '2026-09-14T00:00:00.000Z',
            },
            progress: {
              weekStart: '2026-09-14',
              weekEnd: '2026-09-20',
              targetMet: true,
              metOnDate: '2026-09-19',
              baselineWeightKg: 59.8,
              currentWeightKg: 59.7,
              finalTargetMet: true,
            },
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    const weekEndLabel = formatLocalizedDate('2026-09-20', 'ru')
    const midWeekLabel = formatLocalizedDate('2026-09-19', 'ru')
    expect(screen.getByText(`Цель достигнута ${weekEndLabel}`)).toBeInTheDocument()
    expect(
      screen.queryByText(`Цель достигнута ${midWeekLabel}`),
    ).not.toBeInTheDocument()
    expect(screen.getByText('59,8 → 59,7 кг')).toBeInTheDocument()
  })

  it('shows which two weigh-ins the "target met" status is based on (#339)', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            progress: {
              weekStart: '2026-03-09',
              weekEnd: '2026-03-15',
              targetMet: true,
              metOnDate: '2026-03-12',
              baselineWeightKg: 80,
              currentWeightKg: 78.5,
              finalTargetMet: true,
            },
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('80 → 78.5 kg')).toBeInTheDocument()
  })

  it('preserves entered precision beyond 1 decimal instead of rounding it away (#666)', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            progress: {
              weekStart: '2026-03-09',
              weekEnd: '2026-03-15',
              targetMet: true,
              metOnDate: '2026-03-12',
              baselineWeightKg: 58.9,
              currentWeightKg: 58.85,
              finalTargetMet: true,
            },
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('58.9 → 58.85 kg')).toBeInTheDocument()
  })

  it('shows the previous vs. latest logged weight even when the target was missed (#339)', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            progress: {
              weekStart: '2026-03-09',
              weekEnd: '2026-03-15',
              targetMet: false,
              metOnDate: null,
              baselineWeightKg: 80,
              currentWeightKg: 79.7,
              finalTargetMet: false,
            },
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('80 → 79.7 kg')).toBeInTheDocument()
  })

  it('omits the weigh-in line when no baseline weight was ever logged', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            progress: {
              weekStart: '2026-03-09',
              weekEnd: '2026-03-15',
              targetMet: null,
              metOnDate: null,
              finalTargetMet: null,
            },
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.queryByText(/→/)).not.toBeInTheDocument()
  })

  it('labels a missed target', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            progress: {
              weekStart: '2026-03-09',
              weekEnd: '2026-03-15',
              targetMet: false,
              metOnDate: null,
              finalTargetMet: false,
            },
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Target not met')).toBeInTheDocument()
  })

  it('labels the permanent badge from the final state, not a mid-week crossing that regressed (#639)', () => {
    render(
      <PastTargetsList
        records={[
          makeRecord({
            progress: {
              weekStart: '2026-03-09',
              weekEnd: '2026-03-15',
              targetMet: true, // crossed mid-week, on one noisy day
              metOnDate: '2026-03-11',
              baselineWeightKg: 80,
              currentWeightKg: 79.6, // final state: back above threshold
              finalTargetMet: false,
            },
          }),
        ]}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Target not met')).toBeInTheDocument()
    expect(
      screen.queryByText('Target met on Mar 11, 2026'),
    ).not.toBeInTheDocument()
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

    expect(screen.getByText('Jul 11, 2026 – Jul 18, 2026')).toBeInTheDocument()
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

    expect(screen.getByText('Jul 11, 2026')).toBeInTheDocument()
  })

  describe('deleting a past target (#174)', () => {
    it('asks for confirmation before deleting, and cancel discards it', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      render(<PastTargetsList records={[makeRecord()]} onDelete={onDelete} />)

      await user.click(
        screen.getByRole('button', { name: 'Delete target for Mar 9, 2026 – Mar 15, 2026' }),
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
        screen.getByRole('button', { name: 'Delete target for Mar 9, 2026 – Mar 15, 2026' }),
      )
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(onDelete).toHaveBeenCalledWith('g1')
    })
  })
})
