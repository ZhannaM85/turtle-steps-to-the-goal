import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useFoodOverrideStore } from './foodOverrideStore'

beforeEach(async () => {
  await db.foodOverrides.clear()
  useFoodOverrideStore.setState({ overrides: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.foodOverrides.clear()
})

describe('useFoodOverrideStore', () => {
  it('starts empty', () => {
    expect(useFoodOverrideStore.getState().overrides).toEqual([])
  })

  it('loads persisted overrides', async () => {
    await useFoodOverrideStore.getState().setHidden('wine', true)
    useFoodOverrideStore.setState({ overrides: [], status: 'idle' })

    await useFoodOverrideStore.getState().loadOverrides()

    expect(useFoodOverrideStore.getState().overrides).toHaveLength(1)
    expect(useFoodOverrideStore.getState().overrides[0].foodId).toBe('wine')
  })

  it('setHidden creates a new override on first use', async () => {
    await useFoodOverrideStore.getState().setHidden('wine', true)

    const [override] = useFoodOverrideStore.getState().overrides
    expect(override.foodId).toBe('wine')
    expect(override.hidden).toBe(true)
  })

  it('setHidden(false) after a hide un-hides without deleting the override', async () => {
    await useFoodOverrideStore.getState().setHidden('wine', true)
    await useFoodOverrideStore.getState().setHidden('wine', false)

    const [override] = useFoodOverrideStore.getState().overrides
    expect(override.hidden).toBe(false)
  })

  it('setNutrition records corrected macros without affecting hidden state', async () => {
    await useFoodOverrideStore.getState().setHidden('wine', true)
    await useFoodOverrideStore
      .getState()
      .setNutrition('wine', { kcal100: 70, protein100: 0, fat100: 0, carbs100: 2 })

    const [override] = useFoodOverrideStore.getState().overrides
    expect(override.hidden).toBe(true)
    expect(override.kcal100).toBe(70)
  })

  it('setNutrition and setHidden on the same food merge into one override, not two', async () => {
    await useFoodOverrideStore.getState().setHidden('wine', true)
    await useFoodOverrideStore
      .getState()
      .setNutrition('wine', { kcal100: 70, protein100: 0, fat100: 0, carbs100: 2 })

    expect(useFoodOverrideStore.getState().overrides).toHaveLength(1)
  })

  it('restoreDefault removes the override entirely', async () => {
    await useFoodOverrideStore.getState().setHidden('wine', true)
    await useFoodOverrideStore.getState().restoreDefault('wine')

    expect(useFoodOverrideStore.getState().overrides).toEqual([])
  })
})
