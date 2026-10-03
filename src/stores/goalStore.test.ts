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

  it('closes the previous week on an early reach without making it active (#1079)', async () => {
    const previous = makeGoal({
      id: 'previous',
      weekStart: '2026-09-14',
      weekEnd: '2026-09-20',
      createdAt: '2026-09-14T00:00:00.000Z',
    })
    const next = makeGoal({
      id: 'next',
      weekStart: '2026-09-19',
      weekEnd: '2026-09-25',
      createdAt: '2026-09-19T00:00:00.000Z',
    })
    const closed = { ...previous, weekEnd: '2026-09-19' }

    await useGoalStore.getState().saveGoal(next, closed)

    expect(useGoalStore.getState().goal).toEqual(next)
    expect(await db.goals.get('previous')).toEqual(closed)
    expect(await db.goals.get('next')).toEqual(next)
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

  describe('deleteGoal (#668 / #677 stack)', () => {
    it('removes the only goal from state and the repository', async () => {
      const goal = makeGoal()
      await useGoalStore.getState().saveGoal(goal)

      await useGoalStore.getState().deleteGoal()

      expect(useGoalStore.getState().goal).toBeNull()
      useGoalStore.setState({ goal: null, status: 'idle' })
      await useGoalStore.getState().loadActiveGoal()
      expect(useGoalStore.getState().goal).toBeNull()
    })

    it('is a no-op when there is no active goal', async () => {
      await useGoalStore.getState().deleteGoal()

      expect(useGoalStore.getState().goal).toBeNull()
      expect(useGoalStore.getState().status).toBe('idle')
    })

    it('pops the stack and promotes the previous goal (#677)', async () => {
      const older = makeGoal({
        id: 'older',
        targetWeeklyLossKg: 0.2,
        weekStart: '2026-08-04',
        weekEnd: '2026-08-09',
        createdAt: '2026-08-04T00:00:00.000Z',
      })
      const active = makeGoal({
        id: 'active',
        targetWeeklyLossKg: 0.3,
        weekStart: '2026-08-10',
        weekEnd: '2026-08-16',
        createdAt: '2026-08-10T00:00:00.000Z',
      })
      await useGoalStore.getState().saveGoal(older)
      await useGoalStore.getState().saveGoal(active)

      await useGoalStore.getState().deleteGoal()

      expect(useGoalStore.getState().goal).toEqual(older)
      expect(await db.goals.get('older')).toEqual(older)
      expect(await db.goals.get('active')).toBeUndefined()
    })

    it('still promotes the previous goal after a simulated page refresh (#677)', async () => {
      const older = makeGoal({
        id: 'older',
        targetWeeklyLossKg: 0.2,
        createdAt: '2026-08-04T00:00:00.000Z',
      })
      const active = makeGoal({
        id: 'active',
        targetWeeklyLossKg: 0.3,
        createdAt: '2026-08-10T00:00:00.000Z',
      })
      await useGoalStore.getState().saveGoal(older)
      await useGoalStore.getState().saveGoal(active)
      await useGoalStore.getState().deleteGoal()

      useGoalStore.setState({ goal: null, status: 'idle', error: null })
      await useGoalStore.getState().loadActiveGoal()

      expect(useGoalStore.getState().goal).toEqual(older)
    })

    it('soft-reloads without flipping status through loading', async () => {
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
