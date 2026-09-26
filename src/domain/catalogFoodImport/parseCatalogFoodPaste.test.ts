import { describe, expect, it } from 'vitest'
import { parseCatalogFoodPaste } from './parseCatalogFoodPaste'

const coleslaw = {
  nameRu: 'Салат Коул слоу',
  nameEn: 'Coleslaw',
  caloriesPer100g: 95,
  proteinPer100g: 1.4,
  fatPer100g: 7.5,
  carbsPer100g: 6.3,
  cholesterolImpact: 'beneficial',
  cholesterolReasonRu: 'Полезно для ЛПНП.',
  cholesterolReasonEn: 'Helpful for LDL.',
}

describe('parseCatalogFoodPaste (#1015)', () => {
  it('reads one food object and prefers the Russian reason', () => {
    const result = parseCatalogFoodPaste(JSON.stringify(coleslaw))
    expect(result).toEqual({
      ok: true,
      failures: [],
      foods: [
        {
          nameRu: 'Салат Коул слоу',
          nameEn: 'Coleslaw',
          kcal100: 95,
          protein100: 1.4,
          fat100: 7.5,
          carbs100: 6.3,
          cholesterolImpact: 'beneficial',
          cholesterolReason: 'Полезно для ЛПНП.',
          cholesterolReasonEn: 'Helpful for LDL.',
        },
      ],
    })
  })

  it('reads a foods wrapper and a top-level array', () => {
    const wrapped = parseCatalogFoodPaste(
      JSON.stringify({ nutritionBasis: 'per 100 g', foods: [coleslaw] }),
    )
    const listed = parseCatalogFoodPaste(JSON.stringify([coleslaw]))
    expect(wrapped.ok && wrapped.foods).toHaveLength(1)
    expect(listed.ok && listed.foods).toHaveLength(1)
  })

  it('accepts catalog field names and a numeric string', () => {
    const result = parseCatalogFoodPaste(
      JSON.stringify({
        ru: 'Творог',
        en: 'Cottage cheese',
        kcal100: '98',
        protein100: 11,
        fat100: 5,
        carbs100: 3,
      }),
    )
    expect(result.ok && result.foods[0]).toMatchObject({
      nameRu: 'Творог',
      nameEn: 'Cottage cheese',
      kcal100: 98,
      cholesterolImpact: 'unknown',
    })
    expect(result.ok && result.foods[0]?.cholesterolReason).toBeUndefined()
  })

  it('defaults a missing or invalid LDL impact to unknown', () => {
    const missing = parseCatalogFoodPaste(
      JSON.stringify({ ...coleslaw, cholesterolImpact: undefined }),
    )
    const invalid = parseCatalogFoodPaste(
      JSON.stringify({ ...coleslaw, cholesterolImpact: 'great' }),
    )
    expect(missing.ok && missing.foods[0]?.cholesterolImpact).toBe('unknown')
    expect(invalid.ok && invalid.foods[0]?.cholesterolImpact).toBe('unknown')
  })

  it('keeps the last copy of the same Russian name', () => {
    const result = parseCatalogFoodPaste(
      JSON.stringify([
        coleslaw,
        { ...coleslaw, caloriesPer100g: 110, cholesterolReasonRu: 'Второе.' },
      ]),
    )
    expect(result.ok && result.foods).toHaveLength(1)
    expect(result.ok && result.foods[0]).toMatchObject({
      kcal100: 110,
      cholesterolReason: 'Второе.',
    })
  })

  it('reports foods that fail and still returns the valid ones', () => {
    const result = parseCatalogFoodPaste(
      JSON.stringify({
        foods: [coleslaw, { nameRu: 'Без БЖУ' }, { caloriesPer100g: 1 }, 4],
      }),
    )
    expect(result.ok && result.foods).toHaveLength(1)
    expect(result.ok && result.failures).toEqual([
      { label: 'Без БЖУ', reason: 'missing-macros' },
      { label: 'Item 3', reason: 'missing-name' },
      { label: 'Item 4', reason: 'not-food' },
    ])
  })

  it('refuses JSON that is not per 100 g', () => {
    expect(
      parseCatalogFoodPaste(
        JSON.stringify({ nutritionBasis: 'per serving', foods: [coleslaw] }),
      ),
    ).toEqual({ ok: false, error: 'wrong-basis' })
    expect(parseCatalogFoodPaste('{')).toEqual({
      ok: false,
      error: 'invalid-json',
    })
    expect(parseCatalogFoodPaste(JSON.stringify({ foods: [] }))).toEqual({
      ok: false,
      error: 'empty',
    })
  })
})
