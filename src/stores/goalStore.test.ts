import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from './goalStore'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
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

describe('useGoalStore', () => {
  it('starts with no goal loaded', () => {
    expect(useGoalStore.getState().goal).toBeNull()
    expect(useGoalStore.getState().status).toBe('idle')
  })

  it('loads null when there is no active goal yet', async () => {
    await useGoalStore.getState().loadActiveGoal()

    expect(useGoalStore.getState().goal).toBeNull()
    expect(useGoalStore.getState().status).toBe('ready')
  })

  it('persists a goal and reflects it in state immediately', async () => {
    const goal = makeGoal()
    await useGoalStore.getState().saveGoal(goal)

    expect(useGoalStore.getState().goal).toEqual(goal)
  })

  it('loads the persisted goal into state', async () => {
    const goal = makeGoal()
    await useGoalStore.getState().saveGoal(goal)
    useGoalStore.setState({ goal: null, status: 'idle' })

    await useGoalStore.getState().loadActiveGoal()

    expect(useGoalStore.getState().goal).toEqual(goal)
  })
})
