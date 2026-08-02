import { describe, expect, it } from 'vitest'
import {
  parseOffNutriments,
  parseOffProduct,
  parseOffProductIdentity,
} from './openFoodFactsParse'

describe('parseOffNutriments', () => {
  it('returns null without energy-kcal_100g', () => {
    expect(parseOffNutriments({ proteins_100g: 10 })).toBeNull()
  })

  it('parses macros, fiber, and micros', () => {
    expect(
      parseOffNutriments({
        'energy-kcal_100g': 250,
        proteins_100g: 10,
        fat_100g: 5,
        carbohydrates_100g: 30,
        fiber_100g: 2,
        sodium_100g: 0.4,
        potassium_100g: 150,
        magnesium_100g: 25,
      }),
    ).toEqual({
      kcal100: 250,
      protein100: 10,
      fat100: 5,
      carbs100: 30,
      fiber100: 2,
      sodium100Mg: 400,
      potassium100Mg: 150,
      magnesium100Mg: 25,
    })
  })
})

describe('parseOffProduct', () => {
  it('requires a trimmed product name and kcal', () => {
    expect(
      parseOffProduct({
        product_name: '  ',
        nutriments: { 'energy-kcal_100g': 100 },
      }),
    ).toBeNull()
    expect(
      parseOffProductIdentity({ product_name: 'Yogurt', brands: 'Danone, Other' }),
    ).toEqual({ name: 'Yogurt', brand: 'Danone', code: undefined })
  })

  it('merges identity and nutrition', () => {
    expect(
      parseOffProduct({
        code: '123',
        product_name: 'Oat milk',
        brands: 'Oatly',
        nutriments: { 'energy-kcal_100g': 46, proteins_100g: 1 },
      }),
    ).toMatchObject({
      code: '123',
      name: 'Oat milk',
      brand: 'Oatly',
      kcal100: 46,
      protein100: 1,
    })
  })
})
