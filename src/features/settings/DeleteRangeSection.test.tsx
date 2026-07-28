import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { DeleteRangeSection } from './DeleteRangeSection'

function setRange(start: string, end: string) {
  fireEvent.change(
    screen.getByLabelText('Delete a date range — Start date'),
    { target: { value: start } },
  )
  fireEvent.change(screen.getByLabelText('Delete a date range — End date'), {
    target: { value: end },
  })
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.customMetricEntries.clear()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.customMetricEntries.clear()
})

describe('DeleteRangeSection', () => {
  it('disables the Delete button until both dates are set', () => {
    render(<DeleteRangeSection />)

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  it('shows a count-specific confirm prompt instead of deleting immediately', async () => {
    await db.dailyEntries.put({
      id: 'e1',
      date: '2026-03-05',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.dailyEntries.put({
      id: 'e2',
      date: '2026-04-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<DeleteRangeSection />)
    setRange('2026-03-01', '2026-03-31')

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(
      screen.getByText(
        "This will permanently delete 1 daily entry in this range. This can't be undone.",
      ),
    ).toBeInTheDocument()
    // Nothing deleted yet.
    expect(await db.dailyEntries.toArray()).toHaveLength(2)
  })

  it('mentions custom metric logs in the prompt when the range has any', async () => {
    await db.dailyEntries.put({
      id: 'e1',
      date: '2026-03-05',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'cm1',
      metricId: 'metric-1',
      date: '2026-03-10',
      value: 3,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<DeleteRangeSection />)
    setRange('2026-03-01', '2026-03-31')

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(
      screen.getByText(
        "This will permanently delete 1 daily entry and 1 custom metric log in this range. This can't be undone.",
      ),
    ).toBeInTheDocument()
  })

  it('shows a "nothing to delete" message instead of a confirm step when the range is empty', async () => {
    const user = userEvent.setup()
    render(<DeleteRangeSection />)
    setRange('2026-03-01', '2026-03-31')

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(
      screen.getByText("There's no logged data in that range."),
    ).toBeInTheDocument()
  })

  it('cancels without deleting anything', async () => {
    await db.dailyEntries.put({
      id: 'e1',
      date: '2026-03-05',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<DeleteRangeSection />)
    setRange('2026-03-01', '2026-03-31')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(await db.dailyEntries.toArray()).toHaveLength(1)
  })

  it('deletes only the daily entries and custom metric logs within range, keeping goals and out-of-range data, then reloads', async () => {
    await db.goals.put({
      id: 'g1',
      targetWeeklyLossKg: 0.5,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.dailyEntries.put({
      id: 'e1',
      date: '2026-03-05',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.dailyEntries.put({
      id: 'e2',
      date: '2026-04-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'cm1',
      metricId: 'metric-1',
      date: '2026-03-10',
      value: 3,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'cm2',
      metricId: 'metric-1',
      date: '2026-05-01',
      value: 2,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    const user = userEvent.setup()
    render(<DeleteRangeSection />)
    setRange('2026-03-01', '2026-03-31')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, delete this range' }),
    )

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(await db.goals.toArray()).toHaveLength(1)
    const remainingEntries = await db.dailyEntries.toArray()
    expect(remainingEntries.map((e) => e.date)).toEqual(['2026-04-01'])
    const remainingCustomMetricEntries = await db.customMetricEntries.toArray()
    expect(remainingCustomMetricEntries.map((e) => e.date)).toEqual([
      '2026-05-01',
    ])
  })
})
