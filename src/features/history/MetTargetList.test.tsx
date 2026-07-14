import { render, screen } from '@testing-library/react'
import { addDays, format, startOfISOWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { MetTargetList } from './MetTargetList'

const DATE_FORMAT = 'yyyy-MM-dd'
const WEEK_1_START = format(
  startOfISOWeek(new Date('2026-03-02T00:00:00.000Z')),
  DATE_FORMAT,
)

function weekStart(weekIndex: number): string {
  return format(
    addDays(new Date(`${WEEK_1_START}T00:00:00.000Z`), weekIndex * 7),
    DATE_FORMAT,
  )
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

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('MetTargetList', () => {
  it('renders nothing without a goal', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 87 }),
    ]
    const { container } = render(
      <MetTargetList entries={entries} goal={null} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when no week has met the target yet', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 90 }),
    ]
    const { container } = render(
      <MetTargetList
        entries={entries}
        goal={makeGoal({ targetWeeklyLossKg: 1 })}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists weeks that met the target, most recent first', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 87 }), // -3kg, met
      entry(weekStart(2), { weightKg: 86.9 }), // -0.1kg, missed
    ]
    render(
      <MetTargetList
        entries={entries}
        goal={makeGoal({ targetWeeklyLossKg: 1 })}
      />,
    )

    expect(screen.getByText('Weeks you hit your target')).toBeInTheDocument()
    expect(screen.getByText('-3.0 kg')).toBeInTheDocument()
    expect(screen.queryByText('-0.1 kg')).not.toBeInTheDocument()
  })
})
