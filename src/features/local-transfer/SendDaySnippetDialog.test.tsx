import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { SendDaySnippetDialog } from './SendDaySnippetDialog'

const entry: DailyEntry = {
  id: 'day',
  date: '2026-08-14',
  createdAt: '2026-08-14T07:00:00.000Z',
  updatedAt: '2026-08-14T07:00:00.000Z',
  sleepHours: 7.5,
}

describe('SendDaySnippetDialog (#720)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('copies a shareDay link for a logged day', async () => {
    const user = userEvent.setup()
    render(
      <SendDaySnippetDialog
        open
        onOpenChange={() => {}}
        date="2026-08-14"
        entry={entry}
      />,
    )

    expect(screen.getByText('Whole day')).toBeInTheDocument()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalled()
    const copied = writeText.mock.calls[0]?.[0] as string
    expect(copied).toContain('shareDay=')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('shows nothing-logged when the day is empty', () => {
    render(
      <SendDaySnippetDialog
        open
        onOpenChange={() => {}}
        date="2026-08-14"
        entry={null}
      />,
    )
    expect(
      screen.getByText('Nothing is logged on this day yet.'),
    ).toBeInTheDocument()
  })
})
