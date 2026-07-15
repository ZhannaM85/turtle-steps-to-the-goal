import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
      { id: crypto.randomUUID(), amountKcal: 2000, createdAt: now },
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
    expect(within(rowsInitial[0]).getByText('80 kg')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Sort by date' }))

    const rowsAfterSort = screen.getAllByRole('row').slice(1)
    expect(within(rowsAfterSort[0]).getByText('82 kg')).toBeInTheDocument()
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

    expect(await screen.findByText('79.5 kg')).toBeInTheDocument()
    const persisted = await db.dailyEntries.get(entry.id)
    expect(persisted?.weightKg).toBe(79.5)
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
      expect(screen.queryByText('82.0 kg')).not.toBeInTheDocument()
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
      expect(screen.queryByText('80.0 kg')).not.toBeInTheDocument()
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
      expect(screen.getByText('81 kg')).toBeInTheDocument()
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
      expect(screen.getByText('Meal 1 — 2,000 kcal')).toBeInTheDocument()
    })
  })
})
