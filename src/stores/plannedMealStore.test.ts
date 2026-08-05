import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { usePlannedMealStore } from './plannedMealStore'

beforeEach(async () => {
  await db.plannedMeals.clear()
  usePlannedMealStore.setState({
    plannedMeals: [],
    status: 'idle',
    error: null,
  })
})

afterEach(async () => {
  await db.plannedMeals.clear()
})

describe('usePlannedMealStore', () => {
  it('starts empty', () => {
    expect(usePlannedMealStore.getState().plannedMeals).toEqual([])
  })

  it('loadAll loads persisted planned meals', async () => {
    await db.plannedMeals.put({
      id: 'plan-1',
      date: '2026-08-06',
      name: 'Chicken and rice',
      createdAt: '2026-08-05T20:00:00.000Z',
    })

    await usePlannedMealStore.getState().loadAll()

    expect(usePlannedMealStore.getState().plannedMeals).toHaveLength(1)
    expect(usePlannedMealStore.getState().status).toBe('ready')
  })

  it('addPlannedMeal stages a new draft with an optional calorie estimate', async () => {
    await usePlannedMealStore
      .getState()
      .addPlannedMeal('2026-08-06', 'Chicken and rice', 450)

    const meals = usePlannedMealStore.getState().plannedMeals
    expect(meals).toHaveLength(1)
    expect(meals[0]).toMatchObject({
      date: '2026-08-06',
      name: 'Chicken and rice',
      amountKcal: 450,
    })
    const persisted = await db.plannedMeals.toArray()
    expect(persisted).toHaveLength(1)
  })

  it('addPlannedMeal works with no calorie estimate at all', async () => {
    await usePlannedMealStore
      .getState()
      .addPlannedMeal('2026-08-06', 'Something light', undefined)

    expect(usePlannedMealStore.getState().plannedMeals[0]).toMatchObject({
      name: 'Something light',
      amountKcal: undefined,
    })
  })

  it('addPlannedMeal ignores a blank name', async () => {
    await usePlannedMealStore.getState().addPlannedMeal('2026-08-06', '   ')

    expect(usePlannedMealStore.getState().plannedMeals).toEqual([])
  })

  it('deletePlannedMeal removes a draft', async () => {
    await usePlannedMealStore
      .getState()
      .addPlannedMeal('2026-08-06', 'Chicken and rice')
    const id = usePlannedMealStore.getState().plannedMeals[0].id

    await usePlannedMealStore.getState().deletePlannedMeal(id)

    expect(usePlannedMealStore.getState().plannedMeals).toEqual([])
    expect(await db.plannedMeals.toArray()).toEqual([])
  })
})
