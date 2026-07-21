import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'
import { GoalScreen } from './GoalScreen'

const DATE_FORMAT = 'yyyy-MM-dd'
const WEEK_START = format(new Date(), DATE_FORMAT)

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    weekStart: format(new Date(), 'yyyy-MM-dd'),
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
    id: `goal-screen-entry-${idCounter}`,
    date: WEEK_START,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Same shape as GoalCelebrationModal.test.tsx's seedTargetMetWeeks (#203:
 * day-over-day, not an average) — weekStart's own weight as the baseline
 * (80kg), a later day 1kg below it, meeting a 1kg target. */
async function seedTargetMetWeeks() {
  await db.dailyEntries.put(makeEntry({ date: WEEK_START, weightKg: 80 }))
  await db.dailyEntries.put(
    makeEntry({ date: format(addDays(new Date(), 1), DATE_FORMAT), weightKg: 79 }),
  )
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

describe('GoalScreen', () => {
  it('shows the setup form with no summary when there is no goal yet', async () => {
    render(<GoalScreen />)

    expect(
      await screen.findByRole('button', { name: 'Set this week’s target' }),
    ).toBeInTheDocument()
    expect(screen.queryByText("This week's target")).not.toBeInTheDocument()
  })

  it('shows a read-only summary, then a pre-filled edit form once Edit is tapped (#244)', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    const user = userEvent.setup()

    render(<GoalScreen />)

    expect(
      await screen.findByRole('button', { name: 'Edit goal' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Update this week’s target' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit goal' }))

    expect(
      screen.getByRole('button', { name: 'Update this week’s target' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText("This week's target (kg to lose)"),
    ).toHaveValue('1')
  })

  it("shows the goal's own anchored 7-day window, not a calendar week (#135)", async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ weekStart: '2026-03-09' }))

    render(<GoalScreen />)

    expect(await screen.findByText('Mar 9 – Mar 15')).toBeInTheDocument()
  })

  it('persists an edit and updates the summary', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    const user = userEvent.setup()

    render(<GoalScreen />)
    await user.click(
      await screen.findByRole('button', { name: 'Edit goal' }),
    )

    const weeklyTargetInput = screen.getByLabelText(
      "This week's target (kg to lose)",
    )
    await user.clear(weeklyTargetInput)
    await user.type(weeklyTargetInput, '0.5')
    await user.click(
      screen.getByRole('button', { name: 'Update this week’s target' }),
    )

    expect(await screen.findByText('-0.5')).toBeInTheDocument()
    const persisted = await db.goals.orderBy('createdAt').last()
    expect(persisted?.targetWeeklyLossKg).toBe(0.5)
  })

  it('edits the current week in place rather than adding a history entry (#181)', async () => {
    const original = makeGoal()
    await useGoalStore.getState().saveGoal(original)
    const user = userEvent.setup()

    render(<GoalScreen />)
    await user.click(
      await screen.findByRole('button', { name: 'Edit goal' }),
    )

    const weeklyTargetInput = screen.getByLabelText(
      "This week's target (kg to lose)",
    )
    await user.clear(weeklyTargetInput)
    await user.type(weeklyTargetInput, '0.5')
    await user.click(
      screen.getByRole('button', { name: 'Update this week’s target' }),
    )

    await screen.findByText('-0.5')
    // Still the same one record, same id — not a second history entry
    // (the exact "two rows for the same week" bug this issue fixes).
    expect(await db.goals.count()).toBe(1)
    expect(screen.queryByText('Past targets')).not.toBeInTheDocument()
    const persisted = await db.goals.get(original.id)
    expect(persisted?.id).toBe(original.id)
    expect(persisted?.targetWeeklyLossKg).toBe(0.5)
  })

  it('adds the previous target to the history list instead of overwriting it (#147)', async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ weekStart: '2026-03-09' }))
    const user = userEvent.setup()

    render(<GoalScreen />)
    await user.click(
      await screen.findByRole('button', { name: 'Edit goal' }),
    )
    expect(screen.queryByText('Past targets')).not.toBeInTheDocument()

    const weeklyTargetInput = screen.getByLabelText(
      "This week's target (kg to lose)",
    )
    await user.clear(weeklyTargetInput)
    await user.type(weeklyTargetInput, '0.5')
    await user.click(
      screen.getByRole('button', { name: 'Update this week’s target' }),
    )

    expect(await screen.findByText('Past targets')).toBeInTheDocument()
    expect(screen.getByText('Mar 9 – Mar 15')).toBeInTheDocument()
    expect(await db.goals.count()).toBe(2)
  })

  it('deletes a past target from history after confirming (#174)', async () => {
    // Explicit, clearly-ordered createdAt (#174 CI flake) — both saves
    // otherwise default to `new Date().toISOString()` back-to-back with
    // nothing but an IndexedDB write between them, and a fast runner can
    // give them the same millisecond. getActiveGoal()'s "most recent by
    // createdAt" then becomes ambiguous, so pastGoals() can exclude the
    // wrong goal and "Mar 9 – Mar 15" never renders at all.
    await useGoalStore.getState().saveGoal(
      makeGoal({ weekStart: '2026-03-09', createdAt: '2026-03-09T00:00:00.000Z' }),
    )
    await useGoalStore.getState().saveGoal(
      makeGoal({ weekStart: '2026-03-16', createdAt: '2026-03-16T00:00:00.000Z' }),
    )
    const user = userEvent.setup()

    render(<GoalScreen />)
    await screen.findByText('Mar 9 – Mar 15')
    const remainingGoalsBefore = await db.goals.count()

    await user.click(
      screen.getByRole('button', { name: 'Delete target for Mar 9 – Mar 15' }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    // deleteGoal() re-fetches asynchronously (usePastGoals.ts) after the
    // repository write, so the row's removal isn't synchronous with the click.
    await waitFor(() =>
      expect(screen.queryByText('Mar 9 – Mar 15')).not.toBeInTheDocument(),
    )
    expect(await db.goals.count()).toBe(remainingGoalsBefore - 1)
  })

  it('shows a "Target met" badge and a nudge banner once the active goal has been reached (#155)', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()

    render(<GoalScreen />)

    const reachedDateLabel = format(addDays(new Date(), 1), 'MMM d')
    expect(
      await screen.findByText(`Target met on ${reachedDateLabel}`, {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "You reached this week's target early — set a new one below whenever you're ready.",
      ),
    ).toBeInTheDocument()
  })

  it('does not show the reached badge/banner when the target has not been met', async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 10 })) // unreachable target
    await seedTargetMetWeeks()

    render(<GoalScreen />)
    await screen.findByRole('button', { name: 'Edit goal' })

    expect(screen.queryByText(/Target met on/)).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        "You reached this week's target early — set a new one below whenever you're ready.",
      ),
    ).not.toBeInTheDocument()
  })

  it('starts a fresh history record on the next save once the active goal has been reached (#155)', async () => {
    const original = makeGoal({ targetWeeklyLossKg: 1 })
    await useGoalStore.getState().saveGoal(original)
    await seedTargetMetWeeks()
    const user = userEvent.setup()

    render(<GoalScreen />)
    await screen.findByText(/Target met on/)
    await user.click(screen.getByRole('button', { name: 'Edit goal' }))

    const weeklyTargetInput = screen.getByLabelText(
      "This week's target (kg to lose)",
    )
    await user.clear(weeklyTargetInput)
    await user.type(weeklyTargetInput, '0.5')
    await user.click(
      screen.getByRole('button', { name: 'Update this week’s target' }),
    )

    await screen.findByText('-0.5')
    // A new record was started rather than overwriting the reached one in
    // place — the original's own target stays frozen at 1kg.
    expect(await db.goals.count()).toBe(2)
    const persistedOriginal = await db.goals.get(original.id)
    expect(persistedOriginal?.targetWeeklyLossKg).toBe(1)
  })
})
