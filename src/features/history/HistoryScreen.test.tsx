import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'
import { HistoryScreen } from './HistoryScreen'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-03-01',
    weightKg: 80,
    calorieEntries: [
      {
        id: crypto.randomUUID(),
        items: [{ id: crypto.randomUUID(), amountKcal: 2000 }],
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
})

describe('HistoryScreen', () => {
  it('shows an empty state when there are no entries yet', async () => {
    render(<HistoryScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('No entries yet')).toBeInTheDocument()
  })

  it('lists entries most-recent-first by default, and reverses on sort toggle', async () => {
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01', weightKg: 82 }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-03', weightKg: 80 }))

    render(<HistoryScreen />, { wrapper: MemoryRouter })
    await screen.findByRole('table')

    const rowsInitial = screen.getAllByRole('row').slice(1) // skip header row
    expect(within(rowsInitial[0]).getByText('80')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Sort by date' }))

    const rowsAfterSort = screen.getAllByRole('row').slice(1)
    expect(within(rowsAfterSort[0]).getByText('82')).toBeInTheDocument()
  })

  it('deletes an entry after confirming, and it disappears from the table', async () => {
    const entry = makeEntry({ date: '2026-03-01' })
    await db.dailyEntries.put(entry)

    const user = userEvent.setup()
    render(<HistoryScreen />, { wrapper: MemoryRouter })
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Delete entry' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('No entries yet')).toBeInTheDocument()
    expect(await db.dailyEntries.toArray()).toHaveLength(0)
  })

  it('persists an edit made inline in the table', async () => {
    const entry = makeEntry({ date: '2026-03-01', weightKg: 80 })
    await db.dailyEntries.put(entry)

    const user = userEvent.setup()
    render(<HistoryScreen />, { wrapper: MemoryRouter })
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Edit entry' }))
    const weightInput = screen.getByLabelText('Weight (kg)')
    await user.clear(weightInput)
    await user.type(weightInput, '79.5')
    await user.click(screen.getByRole('button', { name: 'Save weight' }))
    // Saving a field no longer exits edit mode by itself (you might still
    // want to add a meal or edit the note) — "Done" closes the row.
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByText('79.5')).toBeInTheDocument()
    const persisted = await db.dailyEntries.get(entry.id)
    expect(persisted?.weightKg).toBe(79.5)
  })

  it('highlights days within a reached goal window in the List view (#155)', async () => {
    await db.goals.put({
      id: 'goal-1',
      targetWeeklyLossKg: 1,
      weekStart: '2026-03-01',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    })
    // #203: day-over-day against weekStart's own weight — 03-02 is 1kg
    // below 03-01, crossing the 1kg target — window ends up
    // [2026-03-01, 2026-03-02].
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01', weightKg: 80 }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02', weightKg: 79 }))

    render(<HistoryScreen />, { wrapper: MemoryRouter })
    await screen.findByRole('table')

    expect(
      screen.getByText('You reached your target this day', {
        selector: '.sr-only',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Part of a week you reached your target', {
        selector: '.sr-only',
      }),
    ).toBeInTheDocument()
  })

  describe('date filter', () => {
    async function seedThreeEntries() {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01', weightKg: 82 }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-10', weightKg: 81 }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-20', weightKg: 80 }))
    }

    it('shows every entry with no filter set', async () => {
      await seedThreeEntries()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      expect(screen.getAllByRole('row')).toHaveLength(4) // header + 3
    })

    it('filters out entries before the "From" date', async () => {
      await seedThreeEntries()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      fireEvent.change(screen.getByLabelText('From'), {
        target: { value: '2026-03-10' },
      })

      const rows = screen.getAllByRole('row').slice(1)
      expect(rows).toHaveLength(2)
      expect(screen.queryByText('82.0')).not.toBeInTheDocument()
    })

    it('filters out entries after the "To" date', async () => {
      await seedThreeEntries()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      fireEvent.change(screen.getByLabelText('To'), {
        target: { value: '2026-03-10' },
      })

      const rows = screen.getAllByRole('row').slice(1)
      expect(rows).toHaveLength(2)
      expect(screen.queryByText('80.0')).not.toBeInTheDocument()
    })

    it('combines From and To into a range', async () => {
      await seedThreeEntries()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      fireEvent.change(screen.getByLabelText('From'), {
        target: { value: '2026-03-05' },
      })
      fireEvent.change(screen.getByLabelText('To'), {
        target: { value: '2026-03-15' },
      })

      const rows = screen.getAllByRole('row').slice(1)
      expect(rows).toHaveLength(1)
      expect(screen.getByText('81')).toBeInTheDocument()
    })

    it('shows a dedicated empty state when the filter matches nothing, distinct from the true empty state', async () => {
      await seedThreeEntries()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      fireEvent.change(screen.getByLabelText('From'), {
        target: { value: '2026-04-01' },
      })

      expect(
        await screen.findByText('No entries in this range'),
      ).toBeInTheDocument()
      // The MetTargetList/date inputs stay visible — this isn't the
      // never-logged-anything empty state.
      expect(screen.getByLabelText('From')).toBeInTheDocument()
    })

    it('clears the filter and restores the full list', async () => {
      await seedThreeEntries()
      const user = userEvent.setup()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      fireEvent.change(screen.getByLabelText('From'), {
        target: { value: '2026-03-10' },
      })
      await user.click(screen.getByRole('button', { name: 'Clear filter' }))

      const rows = screen.getAllByRole('row').slice(1)
      expect(rows).toHaveLength(3)
      expect(screen.getByLabelText('From')).toHaveValue('')
    })

    it('pre-fills From/To and auto-expands the matching row when arriving via a ?date= deep link (#41)', async () => {
      await seedThreeEntries()
      render(
        <MemoryRouter initialEntries={['/history?date=2026-03-10']}>
          <HistoryScreen />
        </MemoryRouter>,
      )
      await screen.findByRole('table')

      expect(screen.getByLabelText('From')).toHaveValue('2026-03-10')
      expect(screen.getByLabelText('To')).toHaveValue('2026-03-10')
      // One matching entry, but two <tr>s: the summary row plus the
      // auto-expanded detail row rendered alongside it.
      const rows = screen.getAllByRole('row').slice(1)
      expect(rows).toHaveLength(2)
      // Auto-expanded: the meal already visible without clicking anything.
      expect(screen.getByText('Breakfast — 2,000 kcal')).toBeInTheDocument()
    })
  })

  describe('pagination (#162)', () => {
    async function seedEntries(count: number) {
      for (let i = 0; i < count; i++) {
        const date = format(addDays(new Date('2026-01-01'), i), 'yyyy-MM-dd')
        await db.dailyEntries.put(makeEntry({ date, weightKg: 80 }))
      }
    }

    it('shows no pager controls for 20 or fewer entries', async () => {
      await seedEntries(20)
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      expect(screen.getAllByRole('row')).toHaveLength(21) // header + 20
      expect(
        screen.queryByRole('button', { name: 'Next' }),
      ).not.toBeInTheDocument()
    })

    it('shows only the first 20 rows and a page indicator for more than 20 entries', async () => {
      await seedEntries(25)
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      expect(screen.getAllByRole('row')).toHaveLength(21) // header + 20
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    })

    it('advances to the next page and shows the remaining rows', async () => {
      await seedEntries(25)
      const user = userEvent.setup()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      await user.click(screen.getByRole('button', { name: 'Next' }))

      expect(screen.getAllByRole('row')).toHaveLength(6) // header + 5
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    })

    it('clamps back into range once a filter shrinks the result set below the current page', async () => {
      await seedEntries(25)
      const user = userEvent.setup()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await screen.findByText('Page 2 of 2')

      // Narrows to the first 5 days only — page 2 no longer exists.
      fireEvent.change(screen.getByLabelText('To'), {
        target: { value: '2026-01-05' },
      })

      expect(await screen.findByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('row')).toHaveLength(6) // header + 5
      expect(
        screen.queryByRole('button', { name: 'Next' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('search and mood filter (#172)', () => {
    async function seedNotedEntries() {
      await db.dailyEntries.put(
        makeEntry({
          date: '2026-03-01',
          weightKg: 82,
          note: 'Felt great today, best run in weeks',
          emotion: 'happy',
        }),
      )
      await db.dailyEntries.put(
        makeEntry({
          date: '2026-03-10',
          weightKg: 81,
          note: 'Rough day, stressed about work',
          emotion: 'unhappy',
        }),
      )
      await db.dailyEntries.put(
        makeEntry({ date: '2026-03-20', weightKg: 80, emotion: 'neutral' }),
      )
    }

    it('filters by note text, case-insensitively', async () => {
      await seedNotedEntries()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      fireEvent.change(screen.getByLabelText('Search notes'), {
        target: { value: 'GREAT' },
      })

      const rows = screen.getAllByRole('row').slice(1)
      expect(rows).toHaveLength(1)
      expect(screen.getByText('82')).toBeInTheDocument()
    })

    it('filters by mood', async () => {
      await seedNotedEntries()
      const user = userEvent.setup()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      await user.click(
        screen.getByRole('button', { name: 'Unhappy — Filter by mood' }),
      )

      const rows = screen.getAllByRole('row').slice(1)
      expect(rows).toHaveLength(1)
      expect(screen.getByText('81')).toBeInTheDocument()
    })

    it('clicking the same mood again clears the filter', async () => {
      await seedNotedEntries()
      const user = userEvent.setup()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      const unhappyButton = screen.getByRole('button', {
        name: 'Unhappy — Filter by mood',
      })
      await user.click(unhappyButton)
      await user.click(unhappyButton)

      expect(screen.getAllByRole('row').slice(1)).toHaveLength(3)
    })

    it('clear filter also resets search text and mood', async () => {
      await seedNotedEntries()
      const user = userEvent.setup()
      render(<HistoryScreen />, { wrapper: MemoryRouter })
      await screen.findByRole('table')

      fireEvent.change(screen.getByLabelText('Search notes'), {
        target: { value: 'great' },
      })
      await user.click(screen.getByRole('button', { name: 'Clear filter' }))

      expect(screen.getByLabelText('Search notes')).toHaveValue('')
      expect(screen.getAllByRole('row').slice(1)).toHaveLength(3)
    })
  })
})
