import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'
import { GoalScreen } from './GoalScreen'

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

beforeEach(async () => {
  await db.goals.clear()
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
})

afterEach(async () => {
  await db.goals.clear()
})

describe('GoalScreen', () => {
  it('shows the setup form with no summary when there is no goal yet', async () => {
    render(<GoalScreen />)

    expect(
      await screen.findByRole('button', { name: 'Set goal' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/kg → .*kg/)).not.toBeInTheDocument()
  })

  it('shows a summary and a pre-filled edit form when a goal exists', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())

    render(<GoalScreen />)

    expect(await screen.findByText('80.0kg → 70.0kg')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Update goal' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Starting weight (kg)')).toHaveValue('80')
  })

  it('persists an edit and updates the summary', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    const user = userEvent.setup()

    render(<GoalScreen />)
    await screen.findByText('80.0kg → 70.0kg')

    const weeklyPaceInput = screen.getByLabelText('Weekly pace (kg/week)')
    await user.clear(weeklyPaceInput)
    await user.type(weeklyPaceInput, '0.5')
    await user.click(screen.getByRole('button', { name: 'Update goal' }))

    expect(await screen.findByText('0.5')).toBeInTheDocument()
    const persisted = await db.goals.orderBy('createdAt').last()
    expect(persisted?.targetWeeklyLossKg).toBe(0.5)
  })
})
