import { format } from 'date-fns'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { CalendarView } from './CalendarView'

// CalendarView always opens on the real current month, so test dates are
// derived from "today" rather than hardcoded — day 15 is safely mid-month,
// never colliding with a leading/trailing padding-day number.
const today = new Date()
const midMonthDate = format(today, 'yyyy-MM-15')
const midMonthLabel = format(new Date(`${midMonthDate}T00:00:00`), 'PPPP')
const otherDayLabel = format(
  new Date(`${format(today, 'yyyy-MM-10')}T00:00:00`),
  'PPPP',
)

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: midMonthDate,
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('CalendarView', () => {
  it('shows no day detail panel until a day is selected', () => {
    render(<CalendarView entries={[makeEntry()]} onEditDay={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: 'Edit this day' }),
    ).not.toBeInTheDocument()
  })

  it('shows the day detail for a logged day on click', async () => {
    const user = userEvent.setup()
    render(
      <CalendarView
        entries={[makeEntry({ note: 'Great day' })]}
        onEditDay={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: midMonthLabel }))

    expect(screen.getByText('Great day')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit this day' }),
    ).toBeInTheDocument()
  })

  it('shows a quiet empty state for a day with no entry', async () => {
    const user = userEvent.setup()
    render(<CalendarView entries={[]} onEditDay={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: otherDayLabel }))

    expect(screen.getByText('Nothing logged for this day.')).toBeInTheDocument()
  })

  it('calls onEditDay with the selected date', async () => {
    const user = userEvent.setup()
    const onEditDay = vi.fn()
    render(<CalendarView entries={[makeEntry()]} onEditDay={onEditDay} />)

    await user.click(screen.getByRole('button', { name: midMonthLabel }))
    await user.click(screen.getByRole('button', { name: 'Edit this day' }))

    expect(onEditDay).toHaveBeenCalledWith(midMonthDate)
  })

  it('navigates between months', async () => {
    const user = userEvent.setup()
    render(<CalendarView entries={[]} onEditDay={vi.fn()} />)

    const initialMonth = screen.getByText(/\d{4}/).textContent

    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText(/\d{4}/).textContent).not.toBe(initialMonth)

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText(/\d{4}/).textContent).toBe(initialMonth)
  })
})
