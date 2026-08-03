import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWeeklyNoteStore } from '@/stores'
import { WeeklyNoteEditor } from './WeeklyNoteEditor'

beforeEach(() => {
  useWeeklyNoteStore.setState({
    notesByWeekStart: {},
    status: 'ready',
    error: null,
  })
})

describe('WeeklyNoteEditor (#557)', () => {
  it('shows add control when no note exists', () => {
    render(<WeeklyNoteEditor weekStart="2026-07-27" />)
    expect(
      screen.getByRole('button', { name: 'Add weekly note' }),
    ).toBeInTheDocument()
  })

  it('places the add control inside the week StatCard (#565)', async () => {
    const { WeeklySummaryCards } = await import('./WeeklySummaryCards')
    const { format, startOfISOWeek } = await import('date-fns')
    const weekStart = format(
      startOfISOWeek(new Date('2026-03-02T00:00:00.000Z')),
      'yyyy-MM-dd',
    )
    const now = '2026-01-01T00:00:00.000Z'
    render(
      <WeeklySummaryCards
        entries={[
          {
            id: 'entry-1',
            date: weekStart,
            createdAt: now,
            updatedAt: now,
            weightKg: 80,
          },
        ]}
        goal={null}
      />,
    )
    const addNote = screen.getByRole('button', { name: 'Add weekly note' })
    // StatCard renders inside a Card; the note control must be a descendant
    // of that same card surface, not a sibling below it on the white section.
    expect(addNote.closest('[data-slot="card"]')).not.toBeNull()
  })

  it('shows a preview and edits via textarea', async () => {
    const user = userEvent.setup()
    useWeeklyNoteStore.setState({
      notesByWeekStart: { '2026-07-27': 'Pasted ChatGPT advice' },
      status: 'ready',
      error: null,
    })
    const setNote = vi.fn().mockResolvedValue(undefined)
    useWeeklyNoteStore.setState({ setNote })

    render(<WeeklyNoteEditor weekStart="2026-07-27" />)
    expect(screen.getByText('Pasted ChatGPT advice')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Edit weekly note' }),
    )
    const area = screen.getByLabelText('Weekly note')
    await user.clear(area)
    await user.type(area, 'Updated week note')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(setNote).toHaveBeenCalledWith('2026-07-27', 'Updated week note')
  })

  it('expands and collapses a long weekly note preview (#571)', async () => {
    const user = userEvent.setup()
    const longNote =
      'A'.repeat(90) + ' end of the advice from reviewing the export.'
    useWeeklyNoteStore.setState({
      notesByWeekStart: { '2026-07-27': longNote },
      status: 'ready',
      error: null,
    })

    render(<WeeklyNoteEditor weekStart="2026-07-27" />)
    expect(screen.queryByText(longNote)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show full note' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show full note' }))
    expect(screen.getByText(longNote)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show less' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show less' }))
    expect(screen.queryByText(longNote)).not.toBeInTheDocument()
  })
})
