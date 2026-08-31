import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { evaluateDayNutritionFacts, evaluateMealNutritionFacts } from './nutritionFacts'

let idCounter = 0
function makeItem(overrides: Partial<CalorieItem> = {}): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, amountKcal: 0, ...overrides }
}

function makeEntry(items: CalorieItem[]): CalorieEntry {
  idCounter += 1
  return { id: `meal-${idCounter}`, items, createdAt: '2026-01-01T00:00:00.000Z' }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('evaluateMealNutritionFacts', () => {
  it('flags a protein-rich meal at >=20g protein', () => {
    expect(
      evaluateMealNutritionFacts({ proteinG: 20, fatG: 0, carbsG: 0, fiberG: 0 }),
    ).toContain('proteinRichMeal')
    expect(
      evaluateMealNutritionFacts({ proteinG: 19, fatG: 0, carbsG: 0, fiberG: 0 }),
    ).not.toContain('proteinRichMeal')
  })

  it('flags an excellent-fiber meal at >=5g fiber', () => {
    expect(
      evaluateMealNutritionFacts({ proteinG: 0, fatG: 0, carbsG: 0, fiberG: 5 }),
    ).toContain('excellentFiberMeal')
  })

  it('flags a balanced plate within the ~25/30/45 protein/fat/carb split', () => {
    // 30g protein (120kcal), 22g fat (198kcal), 50g carbs (200kcal) = 518kcal
    // ~23%/38%/39% — outside range, should not qualify
    expect(
      evaluateMealNutritionFacts({ proteinG: 30, fatG: 22, carbsG: 50, fiberG: 0 }),
    ).not.toContain('balancedPlateMeal')
    // 30g protein (120kcal), 15g fat (135kcal), 55g carbs (220kcal) = 475kcal
    // ~25%/28%/46% — within range
    expect(
      evaluateMealNutritionFacts({ proteinG: 30, fatG: 15, carbsG: 55, fiberG: 0 }),
    ).toContain('balancedPlateMeal')
  })

  it('does not flag balanced plate for an all-zero meal', () => {
    expect(
      evaluateMealNutritionFacts({ proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 }),
    ).not.toContain('balancedPlateMeal')
  })

  it('flags high-quality carbs when fiber is >=10% of carb grams', () => {
    expect(
      evaluateMealNutritionFacts({ proteinG: 0, fatG: 0, carbsG: 20, fiberG: 2 }),
    ).toContain('highQualityCarbsMeal')
    expect(
      evaluateMealNutritionFacts({ proteinG: 0, fatG: 0, carbsG: 20, fiberG: 1 }),
    ).not.toContain('highQualityCarbsMeal')
  })

  it('does not flag high-quality carbs for a negligible-carb meal', () => {
    expect(
      evaluateMealNutritionFacts({ proteinG: 0, fatG: 0, carbsG: 1, fiberG: 1 }),
    ).not.toContain('highQualityCarbsMeal')
  })
})

describe('evaluateDayNutritionFacts', () => {
  it('flags the daily fiber goal at >=25g', () => {
    const entries = [makeEntry([makeItem({ amountKcal: 100, fiberG: 25 })])]
    expect(evaluateDayNutritionFacts({ calorieEntries: entries })).toContain(
      'dailyFiberGoal',
    )
  })

  it('does not flag sodium/potassium/magnesium facts when nothing was logged', () => {
    const entries = [makeEntry([makeItem({ amountKcal: 100 })])]
    const facts = evaluateDayNutritionFacts({ calorieEntries: entries })
    expect(facts).not.toContain('sodiumConsciousDay')
    expect(facts).not.toContain('potassiumRichDay')
    expect(facts).not.toContain('magnesiumRichDay')
    expect(facts).not.toContain('goodPotassiumSodiumRatio')
  })

  it('flags a sodium-conscious day at <=2300mg', () => {
    const entries = [makeEntry([makeItem({ amountKcal: 100, sodiumMg: 2000 })])]
    expect(evaluateDayNutritionFacts({ calorieEntries: entries })).toContain(
      'sodiumConsciousDay',
    )
  })

  it('flags a good potassium:sodium ratio when potassium >= sodium', () => {
    const entries = [
      makeEntry([makeItem({ amountKcal: 100, sodiumMg: 1000, potassiumMg: 1200 })]),
    ]
    expect(evaluateDayNutritionFacts({ calorieEntries: entries })).toContain(
      'goodPotassiumSodiumRatio',
    )
  })

  it('flags well-hydrated at >=2000ml', () => {
    expect(
      evaluateDayNutritionFacts({
        waterEntries: [{ id: 'w1', amountMl: 2000 }],
      }),
    ).toContain('wellHydrated')
  })

  it('flags on-target calories within 90-110% of the goal target', () => {
    const goal = makeGoal({ dailyCalorieTargetKcal: 2000 })
    const entries = [makeEntry([makeItem({ amountKcal: 2100 })])]
    expect(evaluateDayNutritionFacts({ calorieEntries: entries, goal })).toContain(
      'onTargetCalories',
    )
  })

  it('does not flag on-target calories without a goal target set', () => {
    const entries = [makeEntry([makeItem({ amountKcal: 2000 })])]
    expect(
      evaluateDayNutritionFacts({ calorieEntries: entries }),
    ).not.toContain('onTargetCalories')
  })

  it('flags protein spread through the day once 2+ meals each hit 20g protein', () => {
    const entries = [
      makeEntry([makeItem({ amountKcal: 100, proteinG: 20 })]),
      makeEntry([makeItem({ amountKcal: 100, proteinG: 25 })]),
    ]
    expect(evaluateDayNutritionFacts({ calorieEntries: entries })).toContain(
      'proteinSpreadThroughDay',
    )
  })

  it('does not flag protein spread with only 1 qualifying meal', () => {
    const entries = [
      makeEntry([makeItem({ amountKcal: 100, proteinG: 20 })]),
      makeEntry([makeItem({ amountKcal: 100, proteinG: 5 })]),
    ]
    expect(
      evaluateDayNutritionFacts({ calorieEntries: entries }),
    ).not.toContain('proteinSpreadThroughDay')
  })

  it('does not include per-meal facts — those belong on that meal (#797)', () => {
    const entries = [
      makeEntry([makeItem({ amountKcal: 100, proteinG: 20 })]),
      makeEntry([makeItem({ amountKcal: 100, proteinG: 25 })]),
    ]
    const facts = evaluateDayNutritionFacts({ calorieEntries: entries })
    expect(facts).not.toContain('proteinRichMeal')
    expect(facts).toContain('proteinSpreadThroughDay')
  })
})
