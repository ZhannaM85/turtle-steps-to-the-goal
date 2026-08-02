import type { OnlineFoodHit } from './onlineFoodSearchTypes'

/**
 * #535 — small local RU/EN generics for Add-meal “Search online” when OFF
 * is down or the query is a short everyday name. Not a second curated
 * list competing with `foods.ts` local search — only consulted from the
 * explicit online-search action (and when offline). Numbers are typical
 * per-100g values from the same public tables that seeded `foods.ts`.
 */
type RuGenericEntry = OnlineFoodHit & {
  /** Extra substrings (lowercased) that match this row. */
  aliases: string[]
}

const RU_FOOD_GENERICS: RuGenericEntry[] = [
  {
    name: 'Молоко 2,5%',
    brand: undefined,
    aliases: ['молоко', 'milk', 'молоко 2.5', 'молоко 2,5'],
    kcal100: 52,
    protein100: 2.8,
    fat100: 2.5,
    carbs100: 4.7,
  },
  {
    name: 'Молоко 3,2%',
    aliases: ['молоко цельное', 'whole milk', 'молоко 3.2'],
    kcal100: 60,
    protein100: 2.9,
    fat100: 3.2,
    carbs100: 4.7,
  },
  {
    name: 'Кефир 2,5%',
    aliases: ['кефир', 'kefir'],
    kcal100: 53,
    protein100: 2.9,
    fat100: 2.5,
    carbs100: 4,
  },
  {
    name: 'Творог 5%',
    aliases: ['творог', 'cottage cheese', 'творог 5'],
    kcal100: 121,
    protein100: 17.2,
    fat100: 5,
    carbs100: 1.8,
  },
  {
    name: 'Сметана 20%',
    aliases: ['сметана', 'sour cream'],
    kcal100: 206,
    protein100: 2.8,
    fat100: 20,
    carbs100: 3.2,
  },
  {
    name: 'Масло сливочное',
    aliases: ['масло', 'butter', 'сливочное масло'],
    kcal100: 748,
    protein100: 0.5,
    fat100: 82.5,
    carbs100: 0.8,
  },
  {
    name: 'Яйцо куриное',
    aliases: ['яйцо', 'яйца', 'egg', 'eggs'],
    kcal100: 157,
    protein100: 12.7,
    fat100: 11.5,
    carbs100: 0.7,
  },
  {
    name: 'Хлеб белый',
    aliases: ['хлеб', 'bread', 'белый хлеб'],
    kcal100: 266,
    protein100: 7.6,
    fat100: 3.2,
    carbs100: 50.6,
  },
  {
    name: 'Хлеб ржаной',
    aliases: ['ржаной', 'rye bread'],
    kcal100: 201,
    protein100: 6.4,
    fat100: 1.1,
    carbs100: 41.4,
  },
  {
    name: 'Рис варёный',
    aliases: ['рис', 'rice', 'варёный рис'],
    kcal100: 116,
    protein100: 2.2,
    fat100: 0.5,
    carbs100: 24.9,
  },
  {
    name: 'Гречка варёная',
    aliases: ['гречка', 'греча', 'buckwheat'],
    kcal100: 101,
    protein100: 4.2,
    fat100: 1.1,
    carbs100: 18.6,
  },
  {
    name: 'Овсянка варёная',
    aliases: ['овсянка', 'oatmeal', 'овсяная каша'],
    kcal100: 88,
    protein100: 3,
    fat100: 1.7,
    carbs100: 15,
  },
  {
    name: 'Картофель варёный',
    aliases: ['картофель', 'картошка', 'potato', 'potatoes'],
    kcal100: 82,
    protein100: 2,
    fat100: 0.4,
    carbs100: 16.7,
  },
  {
    name: 'Куриная грудка',
    aliases: ['куриная грудка', 'chicken breast', 'грудка'],
    kcal100: 165,
    protein100: 31,
    fat100: 3.6,
    carbs100: 0,
  },
  {
    name: 'Говядина постная',
    aliases: ['говядина', 'beef'],
    kcal100: 187,
    protein100: 26,
    fat100: 8.6,
    carbs100: 0,
  },
  {
    name: 'Яблоко',
    aliases: ['яблоко', 'apple'],
    kcal100: 47,
    protein100: 0.4,
    fat100: 0.4,
    carbs100: 9.8,
  },
  {
    name: 'Банан',
    aliases: ['банан', 'banana'],
    kcal100: 96,
    protein100: 1.5,
    fat100: 0.5,
    carbs100: 21,
  },
  {
    name: 'Огурец',
    aliases: ['огурец', 'cucumber'],
    kcal100: 15,
    protein100: 0.8,
    fat100: 0.1,
    carbs100: 2.5,
  },
  {
    name: 'Помидор',
    aliases: ['помидор', 'томат', 'tomato'],
    kcal100: 20,
    protein100: 1.1,
    fat100: 0.2,
    carbs100: 3.8,
  },
  {
    name: 'Сыр твёрдый',
    aliases: ['сыр', 'cheese', 'твёрдый сыр'],
    kcal100: 363,
    protein100: 24,
    fat100: 29,
    carbs100: 0.5,
  },
  {
    name: 'Сахар',
    aliases: ['сахар', 'sugar'],
    kcal100: 398,
    protein100: 0,
    fat100: 0,
    carbs100: 99.7,
  },
  {
    name: 'Мёд',
    aliases: ['мёд', 'мед', 'honey'],
    kcal100: 304,
    protein100: 0.8,
    fat100: 0,
    carbs100: 80.3,
  },
  {
    name: 'Шоколад тёмный',
    aliases: ['шоколад', 'chocolate', 'тёмный шоколад'],
    kcal100: 546,
    protein100: 5.4,
    fat100: 35.3,
    carbs100: 52.3,
  },
  {
    name: 'Йогурт натуральный',
    aliases: ['йогурт', 'yogurt', 'yoghurt'],
    kcal100: 60,
    protein100: 5,
    fat100: 1.5,
    carbs100: 3.5,
  },
]

const MAX_HITS = 12

function matchesQuery(entry: RuGenericEntry, needle: string): boolean {
  if (entry.name.toLowerCase().includes(needle)) return true
  return entry.aliases.some((alias) => alias.includes(needle) || needle.includes(alias))
}

/** Synchronous local search for everyday RU/EN staple names (#535). */
export function searchRuFoodGenerics(query: string): OnlineFoodHit[] {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return []

  const hits: OnlineFoodHit[] = []
  for (const entry of RU_FOOD_GENERICS) {
    if (!matchesQuery(entry, needle)) continue
    hits.push({
      name: entry.name,
      brand: entry.brand,
      kcal100: entry.kcal100,
      protein100: entry.protein100,
      fat100: entry.fat100,
      carbs100: entry.carbs100,
      fiber100: entry.fiber100,
      sodium100Mg: entry.sodium100Mg,
      potassium100Mg: entry.potassium100Mg,
      magnesium100Mg: entry.magnesium100Mg,
    })
    if (hits.length >= MAX_HITS) break
  }
  return hits
}
