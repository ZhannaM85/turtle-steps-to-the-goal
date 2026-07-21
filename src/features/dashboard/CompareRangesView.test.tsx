import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { CompareRangesView } from './CompareRangesView'

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

describe('CompareRangesView', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<CompareRangesView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('defaults to comparing this month against last month', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
    const entries = [
      entry('2026-03-05', { weightKg: 80 }), // this month
      entry('2026-02-05', { weightKg: 82 }), // last month
    ]
    render(<CompareRangesView entries={entries} />)

    expect(screen.getAllByText('Range A')).toHaveLength(2)
    expect(screen.getAllByText('Range B')).toHaveLength(2)
    expect(screen.getByLabelText('Range A — Start date')).toHaveValue(
      '2026-03-01',
    )
    expect(screen.getByLabelText('Range B — Start date')).toHaveValue(
      '2026-02-01',
    )
    vi.useRealTimers()
  })

  it('shows the average weight for each range and the delta between them', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
    const entries = [
      entry('2026-03-05', { weightKg: 80 }),
      entry('2026-02-05', { weightKg: 82 }),
    ]
    render(<CompareRangesView entries={entries} />)

    expect(screen.getByText('80.0')).toBeInTheDocument()
    expect(screen.getByText('82.0')).toBeInTheDocument()
    expect(
      screen.getByText('Range B averaged +2.0 kg vs. Range A.'),
    ).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('recomputes the comparison when a date picker changes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
    const user = userEvent.setup({ delay: null })
    const entries = [
      entry('2026-03-05', { weightKg: 80 }),
      entry('2026-01-05', { weightKg: 75 }),
    ]
    render(<CompareRangesView entries={entries} />)

    const rangeBStart = screen.getByLabelText('Range B — Start date')
    await user.clear(rangeBStart)
    await user.type(rangeBStart, '2026-01-01')
    const rangeBEnd = screen.getByLabelText('Range B — End date')
    await user.clear(rangeBEnd)
    await user.type(rangeBEnd, '2026-01-31')

    expect(screen.getByText('75.0')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
