import { describe, expect, it } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import {
  calorieItemToShareMealItem,
  decodeSharedFoodPayload,
  encodeSharedFoodPayload,
  findMatchingMealItem,
  mealItemToSharedFoodPayload,
  parseSharedFoodFromText,
  sharedFoodAbsoluteNutrition,
  type SharedFoodPayload,
} from './sharedFoodPayload'

function item(partial: Partial<MealItem> & Pick<MealItem, 'id' | 'name'>): MealItem {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('sharedFoodPayload (#661)', () => {
  it('round-trips encode/decode', () => {
    const payload: SharedFoodPayload = {
      v: 1,
      name: 'Homemade yogurt',
      brand: 'Kitchen',
      barcode: '4600000000000',
      amountG: 150,
      amountKcal: 120,
      proteinG: 8,
      fatG: 4,
      carbsG: 12,
      kcal100: 80,
      protein100: 5.3,
      fat100: 2.7,
      carbs100: 8,
      servings: [{ en: '1 cup', ru: '1 cup', grams: 150 }],
    }
    const encoded = encodeSharedFoodPayload(payload)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(decodeSharedFoodPayload(encoded)).toEqual(payload)
  })

  it('builds payload from MealItem including per-100g rates', () => {
    const payload = mealItemToSharedFoodPayload(
      item({
        id: '1',
        name: 'Soup',
        lastAmountKcal: 200,
        lastProteinG: 10,
        lastFatG: 5,
        lastCarbsG: 20,
        lastAmountG: 200,
        barcode: '123',
        servings: [{ en: 'bowl', ru: 'bowl', grams: 200 }],
      }),
    )
    expect(payload.name).toBe('Soup')
    expect(payload.barcode).toBe('123')
    expect(payload.amountKcal).toBe(200)
    expect(payload.kcal100).toBe(100)
    expect(payload.protein100).toBe(5)
    expect(payload.servings).toEqual([
      { en: 'bowl', ru: 'bowl', grams: 200 },
    ])
  })

  it('prefers absolute nutrition over per-100g when both present', () => {
    expect(
      sharedFoodAbsoluteNutrition({
        v: 1,
        name: 'X',
        amountKcal: 250,
        proteinG: 12,
        amountG: 180,
        kcal100: 999,
      }),
    ).toEqual({
      amountKcal: 250,
      proteinG: 12,
      fatG: undefined,
      carbsG: undefined,
      amountG: 180,
    })
  })

  it('scales from per-100g when absolutes are missing', () => {
    const nutrition = sharedFoodAbsoluteNutrition({
      v: 1,
      name: 'X',
      kcal100: 100,
      protein100: 10,
      amountG: 50,
    })
    expect(nutrition.amountKcal).toBe(50)
    expect(nutrition.proteinG).toBe(5)
    expect(nutrition.amountG).toBe(50)
  })

  it('matches by barcode first, then by normalized name', () => {
    const items = [
      item({ id: 'a', name: 'Yogurt', barcode: '111' }),
      item({ id: 'b', name: 'Soup' }),
    ]
    expect(
      findMatchingMealItem({ v: 1, name: 'Other', barcode: '111' }, items)?.id,
    ).toBe('a')
    expect(
      findMatchingMealItem({ v: 1, name: '  SOUP ' }, items)?.id,
    ).toBe('b')
    expect(
      findMatchingMealItem({ v: 1, name: 'Missing' }, items),
    ).toBeUndefined()
  })

  it('maps a logged dish onto a shareable MealItem (#801)', () => {
    expect(
      calorieItemToShareMealItem({
        id: 'c1',
        name: '  Soup  ',
        amountKcal: 180,
        proteinG: 8,
        fatG: 4,
        carbsG: 20,
        amountG: 250,
      }),
    ).toMatchObject({
      id: 'c1',
      name: 'Soup',
      lastAmountKcal: 180,
      lastProteinG: 8,
      lastFatG: 4,
      lastCarbsG: 20,
      lastAmountG: 250,
    })
  })

  it('returns null when the dish has no name (#801)', () => {
    expect(
      calorieItemToShareMealItem({ id: 'c1', amountKcal: 10 }),
    ).toBeNull()
  })

  it('overlays library barcode and servings on a logged dish (#801)', () => {
    const library = item({
      id: 'lib',
      name: 'Soup',
      barcode: '999',
      servings: [{ en: 'bowl', ru: 'bowl', grams: 200 }],
    })
    expect(
      calorieItemToShareMealItem(
        { id: 'c1', name: 'Soup', amountKcal: 180, amountG: 200 },
        library,
      ),
    ).toMatchObject({
      id: 'lib',
      barcode: '999',
      lastAmountKcal: 180,
      servings: [{ en: 'bowl', ru: 'bowl', grams: 200 }],
    })
  })

  it('parses share URLs and raw payloads', () => {
    const payload: SharedFoodPayload = { v: 1, name: 'Bread' }
    const encoded = encodeSharedFoodPayload(payload)
    expect(
      parseSharedFoodFromText(
        `https://example.com/app/?shareFood=${encoded}&x=1`,
      ),
    ).toEqual(payload)
    expect(parseSharedFoodFromText(encoded)).toEqual(payload)
    expect(parseSharedFoodFromText('not-valid')).toBeNull()
  })
})
