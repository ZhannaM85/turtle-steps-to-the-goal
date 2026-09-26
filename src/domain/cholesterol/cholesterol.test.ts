import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { foods } from '@/data/foods'
import {
  backfillDailyEntryCholesterol,
  backfillMealItemCholesterol,
  classifyFoodName,
  stampCalorieEntriesCholesterol,
  withCholesterolClassification,
} from './index'

const MEATBALLS = 'Фрикадельки в томатном соусе'
const MEATBALLS_REASON =
  'Мясное блюдо: влияние насыщенных жиров зависит от состава мяса и процента жирности.'

function entryWith(item: CalorieItem): DailyEntry {
  return {
    id: 'day-1',
    date: '2026-09-01',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    calorieEntries: [
      {
        id: 'meal-1',
        createdAt: '2026-09-01T08:30:00.000Z',
        timeEaten: '08:30',
        items: [item],
      },
    ],
  }
}

describe('classifyFoodName (#1011)', () => {
  it('classifies the catalog staples from the food row', () => {
    const added = [
      'Овсянка',
      'Перловка',
      'Чечевица',
      'Фасоль',
      'Нут',
      'Горох',
      'Брокколи',
      'Брюссельская капуста',
      'Морковь',
      'Баклажаны',
      'Яблоки',
      'Цитрусовые',
      'Семена льна',
      'Семена чиа',
      'Псиллиум',
    ]
    for (const name of added) {
      expect(classifyFoodName(name).cholesterolImpact).toBe('beneficial')
    }
    const oats = foods.find((food) => food.ru === 'Овсянка')
    expect(oats?.cholesterolImpact).toBe('beneficial')
    expect(oats?.cholesterolReason).toMatch(/клетчатк/)
    expect(oats?.cholesterolReason).toMatch(/ЛПНП/)
    expect(oats?.cholesterolReason).not.toMatch(/LDL/)
    expect(oats?.en).toBe('Oatmeal')
    expect(classifyFoodName('Oatmeal').cholesterolReason).toBe(
      oats?.cholesterolReason,
    )
    expect(classifyFoodName('Овсянка').cholesterolReason).toBe(
      oats?.cholesterolReason,
    )
  })

  it('matches conservative whitespace and case on a catalog name', () => {
    expect(classifyFoodName('  ОВСЯНКА  ').cholesterolImpact).toBe('beneficial')
    expect(classifyFoodName('Овсянка   ').cholesterolImpact).toBe('beneficial')
    expect(classifyFoodName('Овся').cholesterolImpact).toBe('unknown')
  })

  it('leaves a name the catalog does not label unknown', () => {
    expect(classifyFoodName(MEATBALLS)).toEqual({ cholesterolImpact: 'unknown' })
    expect(classifyFoodName('Масло сливочное')).toEqual({
      cholesterolImpact: 'unknown',
    })
    expect(classifyFoodName('Сыр фасованный Маасдам')).toEqual({
      cholesterolImpact: 'unknown',
    })
    expect(classifyFoodName('Сырник из нового кафе')).toEqual({
      cholesterolImpact: 'unknown',
    })
    expect(classifyFoodName('   ')).toEqual({ cholesterolImpact: 'unknown' })
    expect(classifyFoodName(undefined)).toEqual({ cholesterolImpact: 'unknown' })
  })
})

describe('cholesterol backfill (#1011)', () => {
  it('stamps a catalog name and leaves calories, macros, and time alone', () => {
    const item: CalorieItem = {
      id: 'dish-1',
      name: 'Овсянка',
      amountKcal: 180,
      proteinG: 12,
      fatG: 14,
      carbsG: 0,
      amountG: 40,
    }
    const entry = entryWith(item)
    const before = structuredClone(entry)

    backfillDailyEntryCholesterol(entry)

    const dish = entry.calorieEntries?.[0].items[0]
    expect(dish?.cholesterolImpact).toBe('beneficial')
    expect(dish?.cholesterolReason).toMatch(/клетчатк/)
    expect(dish?.amountKcal).toBe(180)
    expect(dish?.proteinG).toBe(12)
    expect(dish?.fatG).toBe(14)
    expect(dish?.carbsG).toBe(0)
    expect(dish?.amountG).toBe(40)
    expect(dish?.name).toBe('Овсянка')
    expect(entry.date).toBe(before.date)
    expect(entry.calorieEntries?.[0].timeEaten).toBe('08:30')
    expect(entry.calorieEntries?.[0].createdAt).toBe(
      before.calorieEntries?.[0].createdAt,
    )
    expect(entry.calorieEntries).toHaveLength(1)
    expect(entry.calorieEntries?.[0].items).toHaveLength(1)
    expect(dish?.id).toBe('dish-1')
  })

  it('keeps a stored label for a name the catalog does not list', () => {
    const item: CalorieItem = {
      id: 'dish-meatballs',
      name: MEATBALLS,
      amountKcal: 350,
      proteinG: 26,
      fatG: 24,
      carbsG: 6,
      amountG: 200,
      cholesterolImpact: 'moderate',
      cholesterolReason: MEATBALLS_REASON,
    }
    const entry = entryWith(item)
    backfillDailyEntryCholesterol(entry)

    const dish = entry.calorieEntries?.[0].items[0]
    expect(dish?.cholesterolImpact).toBe('moderate')
    expect(dish?.cholesterolReason).toBe(MEATBALLS_REASON)
    expect(dish?.amountKcal).toBe(350)
    expect(dish?.proteinG).toBe(26)
    expect(dish?.fatG).toBe(24)
    expect(dish?.carbsG).toBe(6)
    expect(dish?.amountG).toBe(200)
    expect(dish?.name).toBe(MEATBALLS)
    expect(entry.date).toBe('2026-09-01')
    expect(entry.calorieEntries?.[0].timeEaten).toBe('08:30')

    const once = structuredClone(entry)
    backfillDailyEntryCholesterol(entry)
    expect(entry).toEqual(once)
  })

  it('does not invent a label for an unstamped historical name', () => {
    const entry = entryWith({
      id: 'dish-2',
      name: MEATBALLS,
      amountKcal: 90,
      proteinG: 4,
    })
    backfillDailyEntryCholesterol(entry)
    const once = structuredClone(entry)
    backfillDailyEntryCholesterol(entry)

    expect(entry.calorieEntries?.[0].items[0].cholesterolImpact).toBe('unknown')
    expect(entry.calorieEntries?.[0].items[0].cholesterolReason).toBeUndefined()
    expect(entry).toEqual(once)
    expect(entry.calorieEntries?.[0].items[0].amountKcal).toBe(90)
    expect(entry.calorieEntries?.[0].items[0].proteinG).toBe(4)
  })

  it('does not insert or duplicate library foods', () => {
    const library: MealItem[] = [
      {
        id: 'lib-1',
        name: 'Семена льна',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        lastAmountKcal: 70,
      },
      {
        id: 'lib-2',
        name: 'Неизвестная каша',
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
        lastAmountKcal: 110,
        lastProteinG: 3,
        cholesterolImpact: 'neutral',
        cholesterolReason: 'Мало насыщенных жиров.',
      },
    ]
    for (const food of library) backfillMealItemCholesterol(food)
    for (const food of library) backfillMealItemCholesterol(food)

    expect(library.map((food) => food.id)).toEqual(['lib-1', 'lib-2'])
    expect(library[0].cholesterolImpact).toBe('beneficial')
    expect(library[0].lastAmountKcal).toBe(70)
    expect(library[1].cholesterolImpact).toBe('neutral')
    expect(library[1].cholesterolReason).toBe('Мало насыщенных жиров.')
    expect(library[1].lastAmountKcal).toBe(110)
    expect(library[1].lastProteinG).toBe(3)
  })

  it('stamps a new logged dish from the catalog and leaves other names unknown', () => {
    const entries = stampCalorieEntriesCholesterol([
      {
        id: 'meal',
        createdAt: '2026-09-26T12:00:00.000Z',
        items: [
          { id: 'new', name: 'Свежий смузи', amountKcal: 55, fatG: 1 },
          { id: 'known', name: 'Овсянка', amountKcal: 200, fatG: 2 },
        ],
      },
    ])
    expect(entries[0].items[0]).toMatchObject({
      name: 'Свежий смузи',
      amountKcal: 55,
      fatG: 1,
      cholesterolImpact: 'unknown',
    })
    expect(entries[0].items[0].cholesterolReason).toBeUndefined()
    expect(entries[0].items[1].cholesterolImpact).toBe('beneficial')
    expect(entries[0].items[1].cholesterolReason).toMatch(/клетчатк/)
    expect(entries[0].items[1].amountKcal).toBe(200)

    const again = stampCalorieEntriesCholesterol(entries)
    expect(again).toBe(entries)
  })

  it('restores a stored label when an edit omits it and the name is unchanged', () => {
    const previous: CalorieEntry[] = [
      {
        id: 'meal',
        createdAt: '2026-09-26T12:00:00.000Z',
        items: [
          {
            id: 'meatballs',
            name: MEATBALLS,
            amountKcal: 350,
            fatG: 24,
            cholesterolImpact: 'moderate',
            cholesterolReason: MEATBALLS_REASON,
          },
        ],
      },
    ]
    const edited: CalorieEntry[] = [
      {
        id: 'meal',
        createdAt: '2026-09-26T12:00:00.000Z',
        items: [
          {
            id: 'meatballs',
            name: MEATBALLS,
            amountKcal: 300,
            fatG: 20,
          },
        ],
      },
    ]
    const stamped = stampCalorieEntriesCholesterol(edited, previous)
    expect(stamped[0].items[0]).toMatchObject({
      name: MEATBALLS,
      amountKcal: 300,
      fatG: 20,
      cholesterolImpact: 'moderate',
      cholesterolReason: MEATBALLS_REASON,
    })
  })

  it('drops a stored label when the dish is renamed off the catalog', () => {
    const renamed = withCholesterolClassification(
      {
        name: 'Сырник из нового кафе',
        cholesterolImpact: 'beneficial' as const,
        cholesterolReason: 'Овёс содержит клетчатку.',
      },
      'Овсянка',
    )
    expect(renamed).toEqual({
      name: 'Сырник из нового кафе',
      cholesterolImpact: 'unknown',
    })
  })
})
