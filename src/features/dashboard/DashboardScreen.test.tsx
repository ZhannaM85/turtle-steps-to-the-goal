import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'
import { DashboardScreen } from './DashboardScreen'

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

describe('DashboardScreen', () => {
  it('shows an empty state when there are no entries yet', async () => {
    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('No entries yet')).toBeInTheDocument()
  })

  it('renders the charts and weekly summary once entries exist', async () => {
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))

    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('Weekly summary')).toBeInTheDocument()
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('calories')).toBeInTheDocument()
  })
})
