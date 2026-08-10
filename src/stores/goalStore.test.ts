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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  useGoalStore.setState({
    goal: null,
    status: 'idle',
    error: null,
    skipPromotingNextActive: false,
  })
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

  describe('deleteGoal (#668)', () => {
    it('removes the active goal from state and the repository', async () => {
      const goal = makeGoal()
      await useGoalStore.getState().saveGoal(goal)

      await useGoalStore.getState().deleteGoal()

      expect(useGoalStore.getState().goal).toBeNull()
      useGoalStore.setState({
        goal: null,
        status: 'idle',
        skipPromotingNextActive: false,
      })
      await useGoalStore.getState().loadActiveGoal()
      expect(useGoalStore.getState().goal).toBeNull()
    })

    it('is a no-op when there is no active goal', async () => {
      await useGoalStore.getState().deleteGoal()

      expect(useGoalStore.getState().goal).toBeNull()
      expect(useGoalStore.getState().status).toBe('idle')
    })

    it('does not promote the previous goal via loadActiveGoal in-session (#677)', async () => {
      const older = makeGoal({
        id: 'older',
        targetWeeklyLossKg: 0.1,
        createdAt: '2026-07-28T00:00:00.000Z',
      })
      const active = makeGoal({
        id: 'active',
        targetWeeklyLossKg: 0.2,
        createdAt: '2026-08-04T00:00:00.000Z',
      })
      await useGoalStore.getState().saveGoal(older)
      await useGoalStore.getState().saveGoal(active)

      await useGoalStore.getState().deleteGoal()
      await useGoalStore.getState().loadActiveGoal()

      expect(useGoalStore.getState().goal).toBeNull()
      expect(await db.goals.get('older')).toEqual(older)
      expect(await db.goals.get('active')).toBeUndefined()
    })

    it('soft-reloads without flipping status through loading (#677)', async () => {
      const goal = makeGoal()
      await useGoalStore.getState().saveGoal(goal)
      expect(useGoalStore.getState().status).toBe('ready')

      const pending = useGoalStore.getState().loadActiveGoal()
      expect(useGoalStore.getState().status).toBe('ready')
      await pending
      expect(useGoalStore.getState().status).toBe('ready')
      expect(useGoalStore.getState().goal).toEqual(goal)
    })
  })
})
