import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { generateQrDataUrl } from '@/features/food-share/generateQrDataUrl'
import {
  dailyEntryToDaySnippet,
  daySnippetFitsQr,
  encodeDaySnippetPayload,
} from './daySnippetPayload'
import { SendDaySnippetDialog } from './SendDaySnippetDialog'

vi.mock('@/features/food-share/generateQrDataUrl', () => ({
  generateQrDataUrl: vi.fn(async () => 'data:image/png;base64,qq'),
}))

const entry: DailyEntry = {
  id: 'day',
  date: '2026-08-14',
  createdAt: '2026-08-14T07:00:00.000Z',
  updatedAt: '2026-08-14T07:00:00.000Z',
  sleepHours: 7.5,
}

function bulkyEntry(): DailyEntry {
  return {
    ...entry,
    calorieEntries: Array.from({ length: 40 }, (_, index) => ({
      id: `meal-${index}`,
      createdAt: entry.createdAt,
      label: `Meal ${index} with a fairly long label`,
      items: [
        {
          id: `item-${index}`,
          name: `Very long dish name number ${index} with extra description`,
          amountKcal: 400,
          proteinG: 20,
          fatG: 15,
          carbsG: 40,
        },
      ],
    })),
  }
}

describe('SendDaySnippetDialog (#720, #722)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('copies a shareDay link and shows a QR for a typical day', async () => {
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
    expect(
      await screen.findByRole('img', { name: 'QR code for this day’s log' }),
    ).toBeInTheDocument()
  })

  it('keeps copy/share and explains when the QR would be too large (#722)', async () => {
    const user = userEvent.setup()
    const entryTooBig = bulkyEntry()
    expect(
      daySnippetFitsQr(encodeDaySnippetPayload(dailyEntryToDaySnippet(entryTooBig))),
    ).toBe(false)

    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    render(
      <SendDaySnippetDialog
        open
        onOpenChange={() => {}}
        date="2026-08-14"
        entry={entryTooBig}
      />,
    )

    expect(
      screen.getByText(
        'This day’s log is too large for a reliable QR code. Copy or share the link instead.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'QR code for this day’s log' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalled()
  })

  it('does not regenerate the QR when the parent re-renders (#741)', async () => {
    const qr = vi.mocked(generateQrDataUrl)
    qr.mockClear()
    const { rerender } = render(
      <SendDaySnippetDialog
        open
        onOpenChange={() => {}}
        date="2026-08-14"
        entry={entry}
      />,
    )
    expect(
      await screen.findByRole('img', { name: 'QR code for this day’s log' }),
    ).toBeInTheDocument()
    const callsAfterOpen = qr.mock.calls.length
    expect(callsAfterOpen).toBeGreaterThan(0)
    rerender(
      <SendDaySnippetDialog
        open
        onOpenChange={() => {}}
        date="2026-08-14"
        entry={{ ...entry }}
      />,
    )
    expect(qr).toHaveBeenCalledTimes(callsAfterOpen)
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
    expect(
      screen.getByRole('button', { name: 'Scan QR code' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save as CSV' }),
    ).not.toBeInTheDocument()
  })

  it('downloads a one-day CSV from the share sheet (#795)', async () => {
    const user = userEvent.setup()
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    render(
      <SendDaySnippetDialog
        open
        onOpenChange={() => {}}
        date="2026-08-14"
        entry={entry}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Save as CSV' }))
    expect(URL.createObjectURL).toHaveBeenCalled()
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0] as Blob
    expect(blob.type).toBe('text/csv')
    const text = await blob.text()
    expect(text).toContain('2026-08-14')
    expect(click).toHaveBeenCalled()
  })
})
