import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { ClearAllDataSection } from './ClearAllDataSection'

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.foodOverrides.clear()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.foodOverrides.clear()
})

describe('ClearAllDataSection', () => {
  it('does not touch any data until the confirm step is completed', async () => {
    await db.mealItems.put({
      id: 'm1',
      name: 'Pizza',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<ClearAllDataSection />)

    await user.click(screen.getByRole('button', { name: 'Clear all data' }))
    expect(
      screen.getByText(/Consider exporting a backup first/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.getByRole('button', { name: 'Clear all data' }),
    ).toBeInTheDocument()
    expect(await db.mealItems.toArray()).toHaveLength(1)
  })

  it('wipes every table and reloads once confirmed', async () => {
    await db.goals.put({
      id: 'g1',
      targetWeeklyLossKg: 0.5,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.dailyEntries.put({
      id: 'e1',
      date: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.mealItems.put({
      id: 'm1',
      name: 'Pizza',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.foodOverrides.put({
      foodId: 'f1',
      hidden: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    const user = userEvent.setup()
    render(<ClearAllDataSection />)

    await user.click(screen.getByRole('button', { name: 'Clear all data' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, delete everything' }),
    )

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(await db.goals.toArray()).toEqual([])
    expect(await db.dailyEntries.toArray()).toEqual([])
    expect(await db.mealItems.toArray()).toEqual([])
    expect(await db.foodOverrides.toArray()).toEqual([])
  })
})
