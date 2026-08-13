import { describe, expect, it } from 'vitest'
import { scaleTotalsByWeightChange } from './macroScaling'

describe('scaleTotalsByWeightChange (#715)', () => {
  it('keeps per-100g density when portion weight shrinks (280@50g → 112@20g)', () => {
    const scaled = scaleTotalsByWeightChange(
      280,
      5,
      18.6,
      22.6,
      50,
      20,
    )
    expect(scaled).toEqual({
      amountKcal: 112,
      proteinG: 2,
      fatG: 7.4,
      carbsG: 9,
      fiberG: undefined,
      sodiumMg: undefined,
      potassiumMg: undefined,
      magnesiumMg: undefined,
    })
    // Density check: 112 / 0.2 = 560 kcal/100g (same as 280 / 0.5)
    expect(scaled!.amountKcal / (20 / 100)).toBe(560)
  })

  it('returns null when previous or next grams are missing/non-positive', () => {
    expect(
      scaleTotalsByWeightChange(280, 5, 18.6, 22.6, 0, 20),
    ).toBeNull()
    expect(
      scaleTotalsByWeightChange(280, 5, 18.6, 22.6, 50, 0),
    ).toBeNull()
  })

  it('scales optional electrolytes the same way as macros', () => {
    const scaled = scaleTotalsByWeightChange(
      100,
      10,
      undefined,
      undefined,
      100,
      50,
      4,
      200,
      400,
      80,
    )
    expect(scaled).toMatchObject({
      amountKcal: 50,
      proteinG: 5,
      fiberG: 2,
      sodiumMg: 100,
      potassiumMg: 200,
      magnesiumMg: 40,
    })
  })
})
