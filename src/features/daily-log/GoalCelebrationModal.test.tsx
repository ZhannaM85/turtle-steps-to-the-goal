import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format, startOfISOWeek, subDays } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalCelebrationStore, useGoalStore } from '@/stores'
import { GoalCelebrationModal } from './GoalCelebrationModal'

const DATE_FORMAT = 'yyyy-MM-dd'
const CURRENT_WEEK_START = format(startOfISOWeek(new Date()), DATE_FORMAT)
const PRIOR_WEEK_DAY = format(subDays(new Date(CURRENT_WEEK_START), 3), DATE_FORMAT)

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

let idCounter = 0
function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = new Date().toISOString()
  return {
    id: `entry-${idCounter}`,
    date: CURRENT_WEEK_START,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Seeds a prior week averaging 82kg and a current week averaging 80kg —
 * a 2kg loss against a 1kg target, so targetMet is true. */
async function seedTargetMetWeeks() {
  await db.dailyEntries.put(makeEntry({ date: PRIOR_WEEK_DAY, weightKg: 82 }))
  await db.dailyEntries.put(
    makeEntry({ date: CURRENT_WEEK_START, weightKg: 80 }),
  )
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
  useGoalCelebrationStore.setState({ celebratedWeekStart: null })
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  useGoalCelebrationStore.setState({ celebratedWeekStart: null })
})

describe('GoalCelebrationModal', () => {
  it('does not show when there is no goal', async () => {
    await seedTargetMetWeeks()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText("You reached this week's goal!"),
    ).not.toBeInTheDocument()
  })

  it('does not show when the target was not met', async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 10 })) // unreachable target
    await seedTargetMetWeeks()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText("You reached this week's goal!"),
    ).not.toBeInTheDocument()
  })

  it('shows when the current week met the target', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText("You reached this week's goal!"),
    ).toBeInTheDocument()
  })

  it('does not show again once this week has already been celebrated', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()
    useGoalCelebrationStore.setState({
      celebratedWeekStart: CURRENT_WEEK_START,
    })
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText("You reached this week's goal!"),
    ).not.toBeInTheDocument()
  })

  it('closing the modal persists that this week was celebrated', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    await screen.findByText("You reached this week's goal!")
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(
      screen.queryByText("You reached this week's goal!"),
    ).not.toBeInTheDocument()
    expect(useGoalCelebrationStore.getState().celebratedWeekStart).toBe(
      CURRENT_WEEK_START,
    )
  })

  it('the CTA links to /goal', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    const cta = await screen.findByRole('link', {
      name: "Set next week's goal",
    })
    expect(cta).toHaveAttribute('href', '/goal')
  })
})
