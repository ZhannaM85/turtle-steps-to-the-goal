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
})
