import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    caloriesConsumed: 2000,
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
    render(<HistoryScreen />)

    expect(await screen.findByText('No entries yet')).toBeInTheDocument()
  })

  it('lists entries most-recent-first by default, and reverses on sort toggle', async () => {
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01', weightKg: 82 }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-03', weightKg: 80 }))

    render(<HistoryScreen />)
    await screen.findByRole('table')

    const rowsInitial = screen.getAllByRole('row').slice(1) // skip header row
    expect(within(rowsInitial[0]).getByText('80.0 kg')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Sort by date' }))

    const rowsAfterSort = screen.getAllByRole('row').slice(1)
    expect(within(rowsAfterSort[0]).getByText('82.0 kg')).toBeInTheDocument()
  })

  it('deletes an entry after confirming, and it disappears from the table', async () => {
    const entry = makeEntry({ date: '2026-03-01' })
    await db.dailyEntries.put(entry)

    const user = userEvent.setup()
    render(<HistoryScreen />)
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
    render(<HistoryScreen />)
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Edit entry' }))
    const weightInput = screen.getByLabelText('Weight (kg)')
    await user.clear(weightInput)
    await user.type(weightInput, '79.5')
    await user.click(screen.getByRole('button', { name: 'Update entry' }))

    expect(await screen.findByText('79.5 kg')).toBeInTheDocument()
    const persisted = await db.dailyEntries.get(entry.id)
    expect(persisted?.weightKg).toBe(79.5)
  })
})
