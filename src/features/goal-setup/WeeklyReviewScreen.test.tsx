import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'
import { WeeklyReviewScreen } from './WeeklyReviewScreen'

function renderScreen() {
  return render(<WeeklyReviewScreen />, { wrapper: MemoryRouter })
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    weekStart: '2026-03-02',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

let idCounter = 0
function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `weekly-review-entry-${idCounter}`,
    date,
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

describe('WeeklyReviewScreen (#602)', () => {
  it('shows a calm message when there is no active goal', async () => {
    renderScreen()

    expect(
      await screen.findByText(
        'Set a weekly target on Goal to see a review here.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the not-yet-reached progress line for an in-progress window', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    await db.dailyEntries.put(
      entry('2026-03-02', { weightKg: 80, calorieEntries: [] }),
    )

    renderScreen()

    expect(
      await screen.findByText(
        "Still working toward this week's target — no rush.",
      ),
    ).toBeInTheDocument()
  })

  it('shows the reached-target progress line once the window is met', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await db.dailyEntries.put(entry('2026-03-02', { weightKg: 80 }))
    await db.dailyEntries.put(entry('2026-03-04', { weightKg: 78.5 }))

    renderScreen()

    expect(
      await screen.findByText(/Target reached on/),
    ).toBeInTheDocument()
  })

  it('still shows reached once the (already-ended) window regressed by its final entry (#681)', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await db.dailyEntries.put(entry('2026-03-02', { weightKg: 80 }))
    await db.dailyEntries.put(entry('2026-03-04', { weightKg: 78.5 })) // met mid-week
    await db.dailyEntries.put(entry('2026-03-07', { weightKg: 79.5 })) // regressed by window's end

    renderScreen()

    expect(
      await screen.findByText(/Target reached on/),
    ).toBeInTheDocument()
  })

  it('shows the calorie/protein average once something is logged this week', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    await db.dailyEntries.put(
      entry('2026-03-02', {
        weightKg: 80,
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: 2000, proteinG: 100 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    )

    renderScreen()

    expect(
      await screen.findByText('2,000 kcal/day, 100g protein/day.'),
    ).toBeInTheDocument()
  })

  it('shows the not-enough-data insight message with too little history', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    await db.dailyEntries.put(entry('2026-03-02', { weightKg: 80 }))

    renderScreen()

    expect(
      await screen.findByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })
})
