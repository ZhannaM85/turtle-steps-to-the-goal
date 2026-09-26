import { describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import seedFile from '@/data/cholesterol-foods.json'
import {
  CHOLESTEROL_IMPACTS,
  backfillDailyEntryCholesterol,
  backfillMealItemCholesterol,
  cholesterolMatchKey,
  cholesterolSeed,
  classifyFoodName,
  isCholesterolImpact,
  stampCalorieEntriesCholesterol,
} from './index'

const MAASDAM = 'Сыр фасованный Маасдам'
const BUTTER = 'Масло сливочное'
const PEAS = 'Зелёный горошек'
const UNKNOWN_SEED = 'Exoonenta norm-pre персик-абрикос'

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

describe('cholesterol seed JSON (#1008)', () => {
  it('loads the seed with only allowed impacts and unique names', () => {
    const seed = cholesterolSeed()
    expect(seed).toBe(seedFile)
    expect(seed.schemaVersion).toBe(1)
    expect(seed.description.length).toBeGreaterThan(0)
    expect(Object.keys(seed.impactLevels).sort()).toEqual(
      [...CHOLESTEROL_IMPACTS].sort(),
    )
    expect(seed.foods).toHaveLength(113)

    const names = seed.foods.map((food) => food.name)
    expect(new Set(names).size).toBe(names.length)
    const keys = names.map((name) => cholesterolMatchKey(name))
    expect(new Set(keys).size).toBe(keys.length)

    const impactCounts: Record<string, number> = {}
    for (const food of seed.foods) {
      expect(isCholesterolImpact(food.cholesterolImpact)).toBe(true)
      expect(food.name.trim()).toBe(food.name)
      expect(food.cholesterolReason?.trim().length).toBeGreaterThan(0)
      // #1009: the Day tip reads cholesterolReason, so that field is Russian.
      expect(food.cholesterolReason).toMatch(/[А-Яа-яЁё]/)
      expect(food.cholesterolReason).not.toMatch(/[A-Za-z]{3,}/)
      expect(food.cholesterolReasonEn).toMatch(/[A-Za-z]{3,}/)
      impactCounts[food.cholesterolImpact] =
        (impactCounts[food.cholesterolImpact] ?? 0) + 1
    }
    expect(impactCounts).toEqual({
      beneficial: 25,
      neutral: 38,
      moderate: 31,
      limit: 17,
      high: 1,
      unknown: 1,
    })

    const meatballs = seed.foods.find(
      (food) => food.name === 'Фрикадельки в томатном соусе',
    )
    expect(meatballs?.cholesterolImpact).toBe('moderate')
    expect(meatballs?.cholesterolReason).toMatch(/Мясное блюдо/)
    expect(meatballs?.cholesterolReasonEn).toMatch(/Meat-based dish/)
  })
})

describe('classifyFoodName (#1008)', () => {
  it('matches an exact seed name', () => {
    expect(classifyFoodName(PEAS)).toMatchObject({
      cholesterolImpact: 'beneficial',
    })
    expect(classifyFoodName(BUTTER).cholesterolImpact).toBe('high')
    expect(classifyFoodName(MAASDAM).cholesterolReason).toMatch(/Твёрдый сыр/)
  })

  it('matches conservative whitespace and case, and does not fuzzy-match', () => {
    expect(classifyFoodName(`  ${BUTTER.toUpperCase()}  `).cholesterolImpact).toBe(
      'high',
    )
    expect(classifyFoodName('Масло   сливочное').cholesterolImpact).toBe('high')
    expect(classifyFoodName('Масло').cholesterolImpact).toBe('unknown')
    expect(classifyFoodName('Масло сливочное домашнее').cholesterolReason).toBe(
      undefined,
    )
  })

  it('classifies the added staples as beneficial from the Russian name only', () => {
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
    const oats = cholesterolSeed().foods.find((food) => food.name === 'Овсянка')
    expect(oats?.cholesterolReason).toMatch(/клетчатк/)
    expect(oats?.cholesterolReason).toMatch(/ЛПНП/)
    expect(oats?.cholesterolReason).not.toMatch(/LDL/)
    expect(oats?.nameEn).toBe('Oatmeal')
    expect(classifyFoodName('Oatmeal')).toEqual({ cholesterolImpact: 'unknown' })
    expect(classifyFoodName('Овсянка').cholesterolReason).toBe(oats?.cholesterolReason)
  })

  it('leaves an unmatched name unknown, including a brand-new food', () => {
    expect(classifyFoodName('Сырник из нового кафе')).toEqual({
      cholesterolImpact: 'unknown',
    })
    expect(classifyFoodName('   ')).toEqual({ cholesterolImpact: 'unknown' })
    expect(classifyFoodName(undefined)).toEqual({ cholesterolImpact: 'unknown' })
  })

  it('keeps a seed unknown row unknown and shows its reason', () => {
    const classified = classifyFoodName(UNKNOWN_SEED)
    expect(classified.cholesterolImpact).toBe('unknown')
    expect(classified.cholesterolReason?.length).toBeGreaterThan(0)
  })
})

describe('cholesterol backfill (#1008)', () => {
  it('classifies an existing dish and leaves calories, macros, and time alone', () => {
    const item: CalorieItem = {
      id: 'dish-1',
      name: MAASDAM,
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
    expect(dish?.cholesterolImpact).toBe('limit')
    expect(dish?.cholesterolReason).toMatch(/Твёрдый сыр/)
    expect(dish?.amountKcal).toBe(180)
    expect(dish?.proteinG).toBe(12)
    expect(dish?.fatG).toBe(14)
    expect(dish?.carbsG).toBe(0)
    expect(dish?.amountG).toBe(40)
    expect(dish?.name).toBe(MAASDAM)
    expect(entry.date).toBe(before.date)
    expect(entry.calorieEntries?.[0].timeEaten).toBe('08:30')
    expect(entry.calorieEntries?.[0].createdAt).toBe(
      before.calorieEntries?.[0].createdAt,
    )
    expect(entry.calorieEntries).toHaveLength(1)
    expect(entry.calorieEntries?.[0].items).toHaveLength(1)
    expect(dish?.id).toBe('dish-1')
  })

  it('sets unmatched history to unknown and is idempotent', () => {
    const entry = entryWith({
      id: 'dish-2',
      name: 'Новый суп',
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
    const foods: MealItem[] = [
      {
        id: 'lib-1',
        name: PEAS,
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
      },
    ]
    for (const food of foods) backfillMealItemCholesterol(food)
    for (const food of foods) backfillMealItemCholesterol(food)

    expect(foods.map((food) => food.id)).toEqual(['lib-1', 'lib-2'])
    expect(foods[0].cholesterolImpact).toBe('beneficial')
    expect(foods[0].lastAmountKcal).toBe(70)
    expect(foods[1].cholesterolImpact).toBe('unknown')
    expect(foods[1].lastAmountKcal).toBe(110)
    expect(foods[1].lastProteinG).toBe(3)
    expect(foods[1].cholesterolReason).toBeUndefined()
  })

  it('stamps a new logged dish without changing its calories', () => {
    const entries = stampCalorieEntriesCholesterol([
      {
        id: 'meal',
        createdAt: '2026-09-26T12:00:00.000Z',
        items: [
          { id: 'new', name: 'Свежий смузи', amountKcal: 55, fatG: 1 },
          { id: 'known', name: BUTTER, amountKcal: 200, fatG: 22 },
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
    expect(entries[0].items[1].cholesterolImpact).toBe('high')
    expect(entries[0].items[1].cholesterolReason).toMatch(/насыщенн/)
    expect(entries[0].items[1].amountKcal).toBe(200)

    const again = stampCalorieEntriesCholesterol(entries)
    expect(again).toBe(entries)
  })

  it('replaces a stored English reason with the Russian seed text (#1009)', () => {
    const english =
      'Meat-based dish; saturated-fat impact depends on the meat blend and fat percentage.'
    const item: CalorieItem = {
      id: 'dish-meatballs',
      name: 'Фрикадельки в томатном соусе',
      amountKcal: 350,
      proteinG: 26,
      fatG: 24,
      carbsG: 6,
      amountG: 200,
      cholesterolImpact: 'moderate',
      cholesterolReason: english,
    }
    const entry = entryWith(item)
    backfillDailyEntryCholesterol(entry)

    const dish = entry.calorieEntries?.[0].items[0]
    expect(dish?.cholesterolImpact).toBe('moderate')
    expect(dish?.cholesterolReason).toMatch(/Мясное блюдо/)
    expect(dish?.cholesterolReason).not.toBe(english)
    expect(dish?.amountKcal).toBe(350)
    expect(dish?.proteinG).toBe(26)
    expect(dish?.fatG).toBe(24)
    expect(dish?.carbsG).toBe(6)
    expect(dish?.amountG).toBe(200)
    expect(dish?.name).toBe('Фрикадельки в томатном соусе')
    expect(entry.date).toBe('2026-09-01')
    expect(entry.calorieEntries?.[0].timeEaten).toBe('08:30')

    const once = structuredClone(entry)
    backfillDailyEntryCholesterol(entry)
    expect(entry).toEqual(once)
  })
})
