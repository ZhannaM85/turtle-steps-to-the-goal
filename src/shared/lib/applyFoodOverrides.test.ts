import { describe, expect, it } from 'vitest'
import type { FoodItem } from '@/data/foods'
import type { FoodOverride } from '@/domain/foodOverride'
import { applyFoodOverrides, effectiveFoodItem } from './applyFoodOverrides'

function food(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: 'chicken-breast',
    en: 'Chicken breast',
    ru: 'Куриная грудка',
    kcal100: 165,
    protein100: 31,
    fat100: 3.6,
    carbs100: 0,
    ...overrides,
  }
}

function override(overrides: Partial<FoodOverride> = {}): FoodOverride {
  return {
    foodId: 'chicken-breast',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('effectiveFoodItem', () => {
  it('returns the food unchanged when there is no override', () => {
    expect(effectiveFoodItem(food(), undefined)).toEqual(food())
  })

  it('still returns effective values for a hidden food (no filtering here)', () => {
    const result = effectiveFoodItem(
      food(),
      override({ hidden: true, kcal100: 200 }),
    )
    expect(result.kcal100).toBe(200)
  })
})

describe('applyFoodOverrides', () => {
  it('returns the list unchanged when there are no overrides', () => {
    const foods = [food(), food({ id: 'salmon', en: 'Salmon' })]
    expect(applyFoodOverrides(foods, [])).toEqual(foods)
  })

  it('drops a food hidden by an override', () => {
    const foods = [food(), food({ id: 'salmon', en: 'Salmon' })]
    const result = applyFoodOverrides(foods, [override({ hidden: true })])

    expect(result.map((f) => f.id)).toEqual(['salmon'])
  })

  it('keeps a food with an override that is not hidden', () => {
    const foods = [food()]
    const result = applyFoodOverrides(foods, [override({ hidden: false })])

    expect(result).toHaveLength(1)
  })

  it('substitutes corrected macros for an overridden food', () => {
    const foods = [food()]
    const result = applyFoodOverrides(foods, [
      override({ kcal100: 200, protein100: 25 }),
    ])

    expect(result[0]).toMatchObject({
      kcal100: 200,
      protein100: 25,
      fat100: 3.6, // untouched by the override
      carbs100: 0,
    })
  })

  it('does not mutate the original food objects', () => {
    const original = food()
    applyFoodOverrides([original], [override({ kcal100: 999 })])

    expect(original.kcal100).toBe(165)
  })
})
