import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'
import { GoalScreen } from './GoalScreen'

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

  it('shows a summary and a pre-filled edit form when a goal exists', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())

    render(<GoalScreen />)

    expect(
      await screen.findByRole('button', { name: 'Update this week’s target' }),
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
    await screen.findByRole('button', { name: 'Update this week’s target' })

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

  it('adds the previous target to the history list instead of overwriting it (#147)', async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ weekStart: '2026-03-09' }))
    const user = userEvent.setup()

    render(<GoalScreen />)
    await screen.findByRole('button', { name: 'Update this week’s target' })
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
})
