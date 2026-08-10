import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore, useSectionVisibilityStore } from '@/stores'
import { GoalScreen } from './GoalScreen'

/** GoalForm's useBlocker (#534) requires a data router. */
function renderGoalScreen() {
  const router = createMemoryRouter(
    [{ path: '/goal', element: <GoalScreen /> }],
    { initialEntries: ['/goal'] },
  )
  return render(<RouterProvider router={router} />)
}

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
  resetSectionVisibility()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  resetSectionVisibility()
})

// Merges every key back to true rather than a full literal (see the same
// note on TodayScreen.test.tsx) — stays correct as SectionKey grows.
function resetSectionVisibility() {
  useSectionVisibilityStore.setState((state) => ({
    visible: Object.fromEntries(
      Object.keys(state.visible).map((key) => [key, true]),
    ) as typeof state.visible,
  }))
}

describe('GoalScreen', () => {
  it('shows the setup form with no summary when there is no goal yet', async () => {
    renderGoalScreen()

    expect(
      await screen.findByRole('button', { name: 'Set this week’s target' }),
    ).toBeInTheDocument()
    expect(screen.queryByText("This week's target")).not.toBeInTheDocument()
  })

  it('shows a read-only summary, then a pre-filled edit form once Edit is tapped (#244)', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    const user = userEvent.setup()

    renderGoalScreen()

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

    renderGoalScreen()

    expect(await screen.findByText('Mar 9, 2026 – Mar 15, 2026')).toBeInTheDocument()
  })

  it("doesn't show a reference weight before the goal window's own weekStart weight is logged (#551)", async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

    renderGoalScreen()

    const card = (
      await screen.findAllByText("This week's target")
    )[0].closest('[data-slot="card"]') as HTMLElement
    expect(card).toBeTruthy()
    expect(within(card).queryByText(/from .* kg/)).not.toBeInTheDocument()
  })

  it("falls back to the most recently logged weight when the goal's own weekStart has no weigh-in yet (#675)", async () => {
    const weekStart = format(new Date(), DATE_FORMAT)
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -2), DATE_FORMAT),
        weightKg: 61.4,
      }),
    )
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))

    renderGoalScreen()

    const card = (
      await screen.findAllByText("This week's target")
    )[0].closest('[data-slot="card"]') as HTMLElement
    expect(
      await within(card).findByText('from 61.4 kg', { exact: false }),
    ).toBeInTheDocument()
  })

  it('shows a two-decimal weekly pace without rounding to one decimal (#586)', async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 0.28 }))

    renderGoalScreen()

    const card = (
      await screen.findAllByText("This week's target")
    )[0].closest('[data-slot="card"]') as HTMLElement
    expect(within(card).getByText('0.28')).toBeInTheDocument()
    expect(within(card).queryByText('0.3')).not.toBeInTheDocument()
  })

  it("appends the weight logged on the goal's own weekStart to the weekly target card (#551)", async () => {
    const weekStart = '2026-03-09'
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 58.8 }))

    renderGoalScreen()

    const card = (
      await screen.findAllByText("This week's target")
    )[0].closest('[data-slot="card"]') as HTMLElement
    expect(
      await within(card).findByText('from 58.8 kg', { exact: false }),
    ).toBeInTheDocument()
  })

  it("shows the goal's own weekStart weight on Goal, not a later day's (#551)", async () => {
    const weekStart = '2026-03-09'
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 58.8 }))
    await db.dailyEntries.put(
      makeEntry({ date: '2026-03-11', weightKg: 59.6 }),
    )

    renderGoalScreen()

    const card = (
      await screen.findAllByText("This week's target")
    )[0].closest('[data-slot="card"]') as HTMLElement
    expect(
      await within(card).findByText('from 58.8 kg', { exact: false }),
    ).toBeInTheDocument()
    expect(within(card).queryByText(/from 59\.6 kg/)).not.toBeInTheDocument()
  })

  it('persists an edit and updates the summary', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    const user = userEvent.setup()

    renderGoalScreen()
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

    expect(await screen.findByText('0.5')).toBeInTheDocument()
    const persisted = await db.goals.orderBy('createdAt').last()
    expect(persisted?.targetWeeklyLossKg).toBe(0.5)
  })

  it('edits the current week in place rather than adding a history entry (#181)', async () => {
    const original = makeGoal()
    await useGoalStore.getState().saveGoal(original)
    const user = userEvent.setup()

    renderGoalScreen()
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

    await screen.findByText('0.5')
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

    renderGoalScreen()
    // #678 — concluded active goal already appears in Past Targets before
    // a replacement is saved (weekStart 2026-03-09 ended long ago). The
    // same window string also shows on the main card / Current goal table,
    // so only assert the Past Targets heading here.
    expect(await screen.findByText('Past targets')).toBeInTheDocument()
    // #386 — plain Edit now always edits in place; "Start a new goal" is
    // the explicit action that produces a new history record.
    await user.click(
      await screen.findByRole('button', { name: 'Start a new goal' }),
    )

    const weeklyTargetInput = screen.getByLabelText(
      "This week's target (kg to lose)",
    )
    await user.clear(weeklyTargetInput)
    await user.type(weeklyTargetInput, '0.5')
    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    expect(await screen.findByText('Past targets')).toBeInTheDocument()
    expect(screen.getByText('Mar 9, 2026 – Mar 15, 2026')).toBeInTheDocument()
    expect(await db.goals.count()).toBe(2)
  })

  it('shows a calm pace-check note after 3 consecutive missed weeks (#610)', async () => {
    const pastWeeks: Array<[string, number]> = [
      ['2026-01-05', 90],
      ['2026-01-12', 89.7],
      ['2026-01-19', 89.5],
    ]
    for (const [weekStart, baseline] of pastWeeks) {
      await db.goals.put(
        makeGoal({
          id: `pace-goal-${weekStart}`,
          weekStart,
          createdAt: `${weekStart}T00:00:00.000Z`,
          updatedAt: `${weekStart}T00:00:00.000Z`,
        }),
      )
      await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: baseline }))
      await db.dailyEntries.put(
        makeEntry({
          date: format(addDays(new Date(`${weekStart}T00:00:00.000Z`), 2), DATE_FORMAT),
          weightKg: baseline - 0.3, // below the 1kg target every time
        }),
      )
    }
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

    renderGoalScreen()

    expect(await screen.findByText('Pace check')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Recent weeks moved about +0.3 kg/week vs. your 1 kg/week target — consider adjusting the weekly pace.',
      ),
    ).toBeInTheDocument()
  })

  it('shows no pace-check note when the last 3 weeks are not all misses', async () => {
    // Same 3 weeks as above, but the middle one actually hits target.
    await db.goals.put(
      makeGoal({
        id: 'pace-goal-1',
        weekStart: '2026-01-05',
        createdAt: '2026-01-05T00:00:00.000Z',
        updatedAt: '2026-01-05T00:00:00.000Z',
      }),
    )
    await db.dailyEntries.put(makeEntry({ date: '2026-01-05', weightKg: 90 }))
    await db.dailyEntries.put(
      makeEntry({ date: '2026-01-07', weightKg: 89.7 }),
    )
    await db.goals.put(
      makeGoal({
        id: 'pace-goal-2',
        weekStart: '2026-01-12',
        createdAt: '2026-01-12T00:00:00.000Z',
        updatedAt: '2026-01-12T00:00:00.000Z',
      }),
    )
    await db.dailyEntries.put(makeEntry({ date: '2026-01-12', weightKg: 89.7 }))
    await db.dailyEntries.put(
      makeEntry({ date: '2026-01-14', weightKg: 88.6 }), // hits the 1kg target
    )
    await db.goals.put(
      makeGoal({
        id: 'pace-goal-3',
        weekStart: '2026-01-19',
        createdAt: '2026-01-19T00:00:00.000Z',
        updatedAt: '2026-01-19T00:00:00.000Z',
      }),
    )
    await db.dailyEntries.put(makeEntry({ date: '2026-01-19', weightKg: 89.5 }))
    await db.dailyEntries.put(
      makeEntry({ date: '2026-01-21', weightKg: 89.2 }),
    )
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

    renderGoalScreen()

    await screen.findByText('Past targets')
    expect(screen.queryByText('Pace check')).not.toBeInTheDocument()
  })

  it('deletes a past target from history after confirming (#174)', async () => {
    // Explicit, clearly-ordered createdAt (#174 CI flake) — both saves
    // otherwise default to `new Date().toISOString()` back-to-back with
    // nothing but an IndexedDB write between them, and a fast runner can
    // give them the same millisecond. getActiveGoal()'s "most recent by
    // createdAt" then becomes ambiguous, so pastGoals() can exclude the
    // wrong goal and "Mar 9, 2026 – Mar 15, 2026" never renders at all.
    await useGoalStore.getState().saveGoal(
      makeGoal({ weekStart: '2026-03-09', createdAt: '2026-03-09T00:00:00.000Z' }),
    )
    await useGoalStore.getState().saveGoal(
      makeGoal({ weekStart: '2026-03-16', createdAt: '2026-03-16T00:00:00.000Z' }),
    )
    const user = userEvent.setup()

    renderGoalScreen()
    await screen.findByText('Mar 9, 2026 – Mar 15, 2026')
    const remainingGoalsBefore = await db.goals.count()

    await user.click(
      screen.getByRole('button', {
        name: 'Delete target for Mar 9, 2026 – Mar 15, 2026',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    // deleteGoal() re-fetches asynchronously (usePastGoals.ts) after the
    // repository write, so the row's removal isn't synchronous with the click.
    await waitFor(() =>
      expect(screen.queryByText('Mar 9, 2026 – Mar 15, 2026')).not.toBeInTheDocument(),
    )
    expect(await db.goals.count()).toBe(remainingGoalsBefore - 1)
  })

  it('shows a "Target met" badge and a nudge banner once the active goal has been reached (#155)', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
    await seedTargetMetWeeks()

    renderGoalScreen()

    const reachedDateLabel = format(addDays(new Date(), 1), 'MMM d')
    expect(
      await screen.findByText(`Target met on ${reachedDateLabel}`, {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /keep it up through .* to earn your badge/,
      ),
    ).toBeInTheDocument()
  })

  it('shows the completed nudge, not the mid-week one, once the window has ended with the target still met (#639)', async () => {
    const endedWeekStart = format(addDays(new Date(), -8), DATE_FORMAT)
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart: endedWeekStart }))
    await db.dailyEntries.put(
      makeEntry({ date: endedWeekStart, weightKg: 80 }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -3), DATE_FORMAT),
        weightKg: 79, // last logged entry in the window: target met
      }),
    )

    renderGoalScreen()

    expect(
      await screen.findByText('Goal completed'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "You completed this week's goal! Start a new one below whenever you're ready.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Target reached')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/keep it up through .* to earn your badge/),
    ).not.toBeInTheDocument()
  })

  it('shows a calm missed nudge, not the mid-week reached one, once the window has ended without meeting the target (#639)', async () => {
    const endedWeekStart = format(addDays(new Date(), -8), DATE_FORMAT)
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart: endedWeekStart }))
    await db.dailyEntries.put(
      makeEntry({ date: endedWeekStart, weightKg: 80 }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -3), DATE_FORMAT),
        weightKg: 79.8, // window ended short of the 1kg target
      }),
    )

    renderGoalScreen()

    expect(await screen.findByText("This week's result")).toBeInTheDocument()
    expect(
      screen.getByText(
        "This week's target wasn't reached — that's okay. Start a new one below whenever you're ready.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Target reached')).not.toBeInTheDocument()
    expect(screen.queryByText('Goal completed')).not.toBeInTheDocument()
  })

  it('does not show the reached badge/banner when the target has not been met', async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 10 })) // unreachable target
    await seedTargetMetWeeks()

    renderGoalScreen()
    await screen.findByRole('button', { name: 'Edit goal' })

    expect(screen.queryByText(/Target met on/)).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        /keep it up through .* to earn your badge/,
      ),
    ).not.toBeInTheDocument()
  })

  it('starts a fresh history record via the explicit "Start a new goal" CTA once the active goal has ended and was reached (#155, redesigned for #386)', async () => {
    // #639: restart is now gated to an already-ended window — a still-
    // running "reached" goal (the old seedTargetMetWeeks() shape) can no
    // longer restart at all, so this exercises an ended-and-met window
    // instead, same as the goal-completed nudge test above.
    const endedWeekStart = format(addDays(new Date(), -8), DATE_FORMAT)
    const original = makeGoal({
      targetWeeklyLossKg: 1,
      weekStart: endedWeekStart,
    })
    await useGoalStore.getState().saveGoal(original)
    await db.dailyEntries.put(
      makeEntry({ date: endedWeekStart, weightKg: 80 }),
    )
    await db.dailyEntries.put(
      makeEntry({
        date: format(addDays(new Date(), -7), DATE_FORMAT),
        weightKg: 79,
      }),
    )
    const user = userEvent.setup()

    renderGoalScreen()
    // #639: once the window has ended, the StatCard's "Target met on"
    // badge is gated off in favor of the "Goal completed" nudge below.
    await screen.findByText('Goal completed')
    // #386 — plain Edit now always edits in place, even once the goal has
    // been reached; "Start a new goal" is the explicit action for this.
    await user.click(screen.getByRole('button', { name: 'Start a new goal' }))

    const weeklyTargetInput = screen.getByLabelText(
      "This week's target (kg to lose)",
    )
    await user.clear(weeklyTargetInput)
    await user.type(weeklyTargetInput, '0.5')
    await user.click(
      screen.getByRole('button', { name: 'Set this week’s target' }),
    )

    await screen.findByText('0.5')
    // A new record was started rather than overwriting the reached one in
    // place — the original's own target stays frozen at 1kg.
    expect(await db.goals.count()).toBe(2)
    const persistedOriginal = await db.goals.get(original.id)
    expect(persistedOriginal?.targetWeeklyLossKg).toBe(1)
  })

  describe('dismissible insight sections (#232)', () => {
    it('hides the "This week\'s target" StatCard, keeping the toggle reachable via its own label row', async () => {
      const user = userEvent.setup()
      await useGoalStore.getState().saveGoal(makeGoal())

      renderGoalScreen()
      // "This week's target" legitimately appears twice — this StatCard's
      // own label, and GoalForm's separate #244 read-only summary table
      // (untouched by this toggle) — so every query below is by role
      // (the hide/show button) or an *All* text query, never a bare
      // single-match query for that ambiguous text.
      const hideButton = await screen.findByRole('button', {
        name: "Hide This week's target",
      })

      await user.click(hideButton)

      // StatCard unit (not the GoalForm summary table's "… kg/week" copy).
      expect(screen.queryByText('kg to lose')).not.toBeInTheDocument()
      expect(
        screen.getAllByText("This week's target").length,
      ).toBeGreaterThan(0)
      const showButton = screen.getByRole('button', {
        name: "Show This week's target",
      })

      await user.click(showButton)
      expect(await screen.findByText('kg to lose')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('hides the target-reached nudge banner but keeps its title and toggle visible', async () => {
      const user = userEvent.setup()
      await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))
      await seedTargetMetWeeks()

      renderGoalScreen()
      await screen.findByText(/Target met on/)
      const title = 'Target reached'
      expect(screen.getByText(title)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: `Hide ${title}` }))

      expect(
        screen.queryByText(
          /keep it up through .* to earn your badge/,
        ),
      ).not.toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: `Show ${title}` }))
      expect(
        screen.getByText(
          /keep it up through .* to earn your badge/,
        ),
      ).toBeInTheDocument()
    })

    it('hides the past targets table but keeps its title and toggle visible', async () => {
      const user = userEvent.setup()
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ weekStart: '2026-03-09' }))

      renderGoalScreen()
      // #386 — "Start a new goal" is the explicit action that produces a
      // past-targets history record; plain Edit now always edits in place.
      await user.click(
        await screen.findByRole('button', { name: 'Start a new goal' }),
      )
      const weeklyTargetInput = screen.getByLabelText(
        "This week's target (kg to lose)",
      )
      await user.clear(weeklyTargetInput)
      await user.type(weeklyTargetInput, '0.5')
      await user.click(
        screen.getByRole('button', { name: 'Set this week’s target' }),
      )
      await screen.findByText('Past targets')

      await user.click(
        screen.getByRole('button', { name: 'Hide Past targets' }),
      )

      expect(screen.queryByText('Mar 9, 2026 – Mar 15, 2026')).not.toBeInTheDocument()
      expect(screen.getByText('Past targets')).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Show Past targets' }),
      )
      expect(screen.getByText('Mar 9, 2026 – Mar 15, 2026')).toBeInTheDocument()
    })
  })
})
