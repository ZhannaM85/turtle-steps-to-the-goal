import 'fake-indexeddb/auto'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalCelebrationStore, useGoalStore } from '@/stores'
import { GoalCelebrationModal } from './GoalCelebrationModal'

const DATE_FORMAT = 'yyyy-MM-dd'
// The goal's own anchored window (#135) — today, rather than a calendar
// ISO week — so "current window" entries just need to fall on/after this.
const WEEK_START = format(new Date(), DATE_FORMAT)

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    weekStart: WEEK_START,
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
    date: WEEK_START,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** IndexedDB fetch in useActiveGoalProgress is async; wait so a late
 * complete-modal show would fail a "must stay hidden" assertion. */
async function flushProgress() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
}

/** Seeds weekStart's own weight (80kg) as the day-over-day baseline (#203)
 * plus a later day 1kg below it (79kg), meeting a 1kg target. */
async function seedTargetMetWeeks() {
  await db.dailyEntries.put(makeEntry({ date: WEEK_START, weightKg: 80 }))
  await db.dailyEntries.put(
    makeEntry({
      date: format(addDays(new Date(), 1), DATE_FORMAT),
      weightKg: 79,
    }),
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
    weightSaveGeneration: 0,
    completeOfferDismissedGeneration: null,
  })
  useGoalCelebrationStore.setState({
    celebratedInProgressWeekStart: null,
    celebratedCompleteWeekStart: null,
    reachedOnLastDayWeekStart: null,
  })
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  useGoalCelebrationStore.setState({
    celebratedInProgressWeekStart: null,
    celebratedCompleteWeekStart: null,
    reachedOnLastDayWeekStart: null,
  })
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
      screen.queryByText("You reached this week's target!"),
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
      screen.queryByText("You reached this week's target!"),
    ).not.toBeInTheDocument()
  })

  it('shows the reframed mid-week copy when the still-running week met the target (#639)', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText("You reached this week's target!"),
    ).toBeInTheDocument()
    // Reframed — no longer claims the goal itself is done mid-week.
    expect(
      screen.queryByText("You completed your weekly goal!"),
    ).not.toBeInTheDocument()
  })

  it('does not show again once this week has already been celebrated in-progress', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()
    useGoalCelebrationStore.setState({
      celebratedInProgressWeekStart: WEEK_START,
    })
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText("You reached this week's target!"),
    ).not.toBeInTheDocument()
  })

  it('closing the modal persists that this week was celebrated in-progress', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    await screen.findByText("You reached this week's target!")
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(
      screen.queryByText("You reached this week's target!"),
    ).not.toBeInTheDocument()
    expect(
      useGoalCelebrationStore.getState().celebratedInProgressWeekStart,
    ).toBe(WEEK_START)
  })

  it('the mid-week CTA reviews the goal rather than claiming it can be restarted (#639)', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    const cta = await screen.findByRole('link', { name: 'Review goal' })
    expect(cta).toHaveAttribute('href', '/goal')
  })

  it('does not show the completion copy on mount just because the window already ended (#783)', async () => {
    await useGoalStore.getState().saveGoal(
      makeGoal({
        targetWeeklyLossKg: 1,
        weekStart: format(addDays(new Date(), -8), DATE_FORMAT), // ended
      }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -8), DATE_FORMAT),
        weightKg: 80,
      }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -3), DATE_FORMAT),
        weightKg: 79,
      }),
    )
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    await flushProgress()
    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()
  })

  it('shows the completion copy after a weight save when the window ended with the target still met (#639, #783)', async () => {
    await useGoalStore.getState().saveGoal(
      makeGoal({
        targetWeeklyLossKg: 1,
        weekStart: format(addDays(new Date(), -8), DATE_FORMAT), // ended
      }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -8), DATE_FORMAT),
        weightKg: 80,
      }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -3), DATE_FORMAT),
        weightKg: 79, // last logged entry in the window: target met
      }),
    )
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    await flushProgress()
    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()
    useDailyEntryStore.getState().noteWeightSaved()

    const cta = await screen.findByRole('link', {
      name: "Set next week's goal",
    })
    expect(
      screen.getByText('You completed your weekly goal!'),
    ).toBeInTheDocument()
    expect(cta).toHaveAttribute('href', '/goal')
  })

  it('does not show completion copy when the window ended without meeting the target (#639)', async () => {
    await useGoalStore.getState().saveGoal(
      makeGoal({
        targetWeeklyLossKg: 1,
        weekStart: format(addDays(new Date(), -8), DATE_FORMAT), // ended
      }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -8), DATE_FORMAT),
        weightKg: 80,
      }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -3), DATE_FORMAT),
        weightKg: 79.8, // window ended short of the 1kg target
      }),
    )
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("You reached this week's target!"),
    ).not.toBeInTheDocument()
  })

  it('shows the completion copy after a weight save when the target is reached on the window\'s own last day (#667, #783)', async () => {
    const weekStart = format(addDays(new Date(), -6), DATE_FORMAT) // weekEnd is today
    await useGoalStore.getState().saveGoal(
      makeGoal({ targetWeeklyLossKg: 1, weekStart }),
    )
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 80 }))
    await db.dailyEntries.put(
      makeEntry({
        date: format(new Date(), DATE_FORMAT), // today, the window's last day
        weightKg: 79, // meets the 1kg target today
      }),
    )
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    await flushProgress()
    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()
    useDailyEntryStore.getState().noteWeightSaved()

    const cta = await screen.findByRole('link', {
      name: "Set next week's goal",
    })
    expect(
      screen.getByText('You completed your weekly goal!'),
    ).toBeInTheDocument()
    expect(cta).toHaveAttribute('href', '/goal')
  })

  it('does not show completion copy on weekEnd until that day’s weight is logged (#776)', async () => {
    const weekStart = format(addDays(new Date(), -6), DATE_FORMAT) // weekEnd is today
    await useGoalStore.getState().saveGoal(
      makeGoal({ targetWeeklyLossKg: 1, weekStart }),
    )
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 80 }))
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -1), DATE_FORMAT), // yesterday, not today
        weightKg: 79, // mid-week hit; no last-day weigh-in yet
      }),
    )
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByText("You reached this week's target!"),
    ).toBeInTheDocument()
  })

  it('still offers the complete modal after a weight save even if a prior dismiss was persisted (#778, #783)', async () => {
    const weekStart = format(addDays(new Date(), -6), DATE_FORMAT)
    await useGoalStore.getState().saveGoal(
      makeGoal({ targetWeeklyLossKg: 1, weekStart }),
    )
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 80 }))
    await db.dailyEntries.put(
      makeEntry({
        date: format(new Date(), DATE_FORMAT),
        weightKg: 79,
      }),
    )
    useGoalCelebrationStore.setState({
      celebratedCompleteWeekStart: weekStart,
    })
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    await flushProgress()
    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()
    useDailyEntryStore.getState().noteWeightSaved()
    expect(
      await screen.findByText('You completed your weekly goal!'),
    ).toBeInTheDocument()
  })

  it('does not show the complete modal again after remount once it was closed this visit (#783)', async () => {
    const weekStart = format(addDays(new Date(), -6), DATE_FORMAT)
    await useGoalStore.getState().saveGoal(
      makeGoal({ targetWeeklyLossKg: 1, weekStart }),
    )
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 80 }))
    await db.dailyEntries.put(
      makeEntry({
        date: format(new Date(), DATE_FORMAT),
        weightKg: 79,
      }),
    )
    useDailyEntryStore.getState().noteWeightSaved()
    const user = userEvent.setup()
    const { unmount } = render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    await screen.findByText('You completed your weekly goal!')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )
    await flushProgress()
    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()
  })

  it('shows the complete modal again after last-day weight is deleted and logged again (#778, #783)', async () => {
    const today = format(new Date(), DATE_FORMAT)
    const weekStart = format(addDays(new Date(), -6), DATE_FORMAT)
    await useGoalStore.getState().saveGoal(
      makeGoal({ targetWeeklyLossKg: 1, weekStart }),
    )
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 80 }))
    const lastDay = makeEntry({ date: today, weightKg: 79 })
    await db.dailyEntries.put(lastDay)
    useDailyEntryStore.setState({
      date: today,
      entry: lastDay,
      status: 'idle',
      error: null,
    })
    useDailyEntryStore.getState().noteWeightSaved()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <GoalCelebrationModal />
      </MemoryRouter>,
    )

    await screen.findByText('You completed your weekly goal!')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(
      screen.queryByText('You completed your weekly goal!'),
    ).not.toBeInTheDocument()

    const withoutWeight: DailyEntry = {
      ...lastDay,
      weightKg: undefined,
      updatedAt: new Date().toISOString(),
    }
    await db.dailyEntries.put(withoutWeight)
    useDailyEntryStore.setState({
      date: today,
      entry: withoutWeight,
      status: 'idle',
      error: null,
    })
    await waitFor(() => {
      expect(
        screen.queryByText('You completed your weekly goal!'),
      ).not.toBeInTheDocument()
    })

    const withWeightAgain: DailyEntry = {
      ...lastDay,
      weightKg: 79,
      updatedAt: new Date().toISOString(),
    }
    await db.dailyEntries.put(withWeightAgain)
    useDailyEntryStore.setState({
      date: today,
      entry: withWeightAgain,
      status: 'idle',
      error: null,
    })
    useDailyEntryStore.getState().noteWeightSaved()
    expect(
      await screen.findByText('You completed your weekly goal!'),
    ).toBeInTheDocument()
  })
})
