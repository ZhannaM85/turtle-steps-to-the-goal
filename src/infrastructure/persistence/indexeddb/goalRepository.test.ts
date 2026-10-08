import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import { pastGoals } from '@/domain/goal'
import { db } from './db'
import { IndexedDbGoalRepository } from './goalRepository'

const previous: Goal = {
  id: 'previous', weekStart: '2026-09-28', weekEnd: '2026-10-04',
  baselineWeightKg: 60.15, targetWeeklyLossKg: 0.1,
  createdAt: '2026-09-28T08:00:00Z', updatedAt: '2026-09-28T08:00:00Z',
}
const next: Goal = {
  ...previous, id: 'next', weekStart: '2026-10-03', weekEnd: '2026-10-11',
  baselineWeightKg: 60, createdAt: '2026-10-03T08:00:00Z',
}
const repository = new IndexedDbGoalRepository()

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.dailyEntries.bulkPut([
    { id: 'start', date: '2026-09-28', weightKg: 60.15, createdAt: '2026-09-28T07:00:00Z', updatedAt: '2026-09-28T07:00:00Z' },
    { id: 'reached', date: '2026-10-03', weightKg: 60, createdAt: '2026-10-03T07:00:00Z', updatedAt: '2026-10-03T07:00:00Z' },
    { id: 'later', date: '2026-10-04', weightKg: 60.6, createdAt: '2026-10-04T07:00:00Z', updatedAt: '2026-10-04T07:00:00Z' },
  ])
})
afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
})

describe('goal early-closure persistence (#1090)', () => {
  it('closes at save time without a form-provided early closure', async () => {
    await repository.saveGoal(previous)
    await repository.saveGoal(next)
    expect(await db.goals.get('previous')).toMatchObject({ weekEnd: '2026-10-03', baselineWeightKg: 60.15 })
    expect(await repository.getActiveGoal()).toEqual(next)
  })

  it.each(['2026-10-04', undefined])('repairs existing/imported goals with stored end %s and persists on reload', async (weekEnd) => {
    await db.goals.bulkPut([{ ...previous, weekEnd }, next])
    const goals = await repository.getAll()
    const [record] = pastGoals(goals, await db.dailyEntries.toArray(), '2026-10-08')
    expect(record.goal.weekEnd).toBe('2026-10-03')
    expect(record.progress).toMatchObject({ finalTargetMet: true, metOnDate: '2026-10-03', currentWeightKg: 60 })
    const stored = await db.goals.get('previous')
    expect(stored?.baselineWeightKg).toBe(60.15)
    expect(await new IndexedDbGoalRepository().getAll()).toEqual(goals)
    expect(await db.goals.get('previous')).toEqual(stored)
  })
})
