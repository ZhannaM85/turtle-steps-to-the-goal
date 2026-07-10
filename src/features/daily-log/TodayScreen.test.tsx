import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format, subDays } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalStore } from '@/stores'
import { TodayScreen } from './TodayScreen'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    startDate: '2026-01-01',
    startWeightKg: 80,
    targetWeightKg: 70,
    targetWeeklyLossKg: 1,
    displayUnit: 'kg',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: format(new Date(), 'yyyy-MM-dd'),
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
  useDailyEntryStore.setState({
    date: null,
    entry: null,
    status: 'idle',
    error: null,
  })
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
})

describe('TodayScreen', () => {
  it('shows an empty state with a link to set a goal when none exists', async () => {
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No goal set yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Set a goal' })).toHaveAttribute(
      'href',
      '/goal',
    )
  })

  it("shows this week's target once a goal is active", async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText("This week's target")).toBeInTheDocument()
    expect(screen.getByText('1.0')).toBeInTheDocument()
    expect(screen.getByText('kg to lose')).toBeInTheDocument()
  })

  it('defaults the date picker to today and shows a blank log form', async () => {
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Date')).toHaveValue(
      format(new Date(), 'yyyy-MM-dd'),
    )
    expect(
      await screen.findByRole('button', { name: 'Log entry' }),
    ).toBeInTheDocument()
  })

  it("logs today's entry and persists it", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    await user.type(await screen.findByLabelText('Weight (kg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    expect(
      await screen.findByRole('button', { name: 'Update entry' }),
    ).toBeInTheDocument()
    const today = format(new Date(), 'yyyy-MM-dd')
    const persisted = await db.dailyEntries.where('date').equals(today).first()
    expect(persisted?.weightKg).toBe(80)
  })

  it('back-fills a past date without touching the current entry', async () => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    const dateInput = await screen.findByLabelText('Date')
    fireEvent.change(dateInput, { target: { value: yesterday } })

    await user.type(await screen.findByLabelText('Weight (kg)'), '81')
    await user.click(screen.getByRole('button', { name: 'Log entry' }))

    await screen.findByRole('button', { name: 'Update entry' })

    const backfilled = await db.dailyEntries
      .where('date')
      .equals(yesterday)
      .first()
    expect(backfilled?.weightKg).toBe(81)

    const today = format(new Date(), 'yyyy-MM-dd')
    const todayEntry = await db.dailyEntries.where('date').equals(today).first()
    expect(todayEntry).toBeUndefined()
  })

  it('loads an existing entry for editing when picking a date that already has one', async () => {
    await useDailyEntryStore
      .getState()
      .saveEntry(makeEntry({ weightKg: 79.5, caloriesConsumed: 1900 }))
    useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Weight (kg)')).toHaveValue(79.5)
    expect(screen.getByLabelText('Calories')).toHaveValue(1900)
    expect(
      screen.getByRole('button', { name: 'Update entry' }),
    ).toBeInTheDocument()
  })
})
