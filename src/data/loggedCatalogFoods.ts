import { isCholesterolImpact } from '@/domain/cholesterol/cholesterolTypes'
import type { FoodItem } from './foods'
import {
  LOGGED_CATALOG_SEEDS,
  type LoggedCatalogSeed,
} from './loggedCatalogSeeds'

/**
 * #1017 — logged foods on the one meal-search catalog.
 * Match is the exact Russian name, same as the LDL staples. Brands and
 * the English LDL reason stay off the row: `FoodItem` has no place for
 * them. Russian reasons use «ЛПНП», not the Latin LDL from the source.
 */

export interface ResolvedLoggedCatalogFood {
  nameRu: string
  nameEn: string
  kcal100: number
  protein100: number
  fat100: number
  carbs100: number
  cholesterolImpact: NonNullable<FoodItem['cholesterolImpact']>
  cholesterolReason: string
}

function finiteMacro(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Latin LDL in a Russian sentence becomes «ЛПНП» for the Day tip. */
export function loggedCatalogRussianReason(reason: string): string {
  return reason.replaceAll('LDL', 'ЛПНП').trim()
}

/**
 * Fills a seed from the catalog already on screen. Missing protein or
 * fat is copied from the exact Russian name when that row has both;
 * otherwise the food is skipped. Missing carbs use that row, or 0.
 */
export function resolveLoggedCatalogSeed(
  seed: LoggedCatalogSeed,
  catalog: readonly Pick<
    FoodItem,
    'ru' | 'protein100' | 'fat100' | 'carbs100'
  >[],
): ResolvedLoggedCatalogFood | null {
  if (!finiteMacro(seed.kcal100)) return null
  const existing = catalog.find((food) => food.ru === seed.nameRu)
  let protein = finiteMacro(seed.protein100) ? seed.protein100 : null
  let fat = finiteMacro(seed.fat100) ? seed.fat100 : null
  if (protein === null || fat === null) {
    if (
      existing &&
      finiteMacro(existing.protein100) &&
      finiteMacro(existing.fat100)
    ) {
      if (protein === null) protein = existing.protein100
      if (fat === null) fat = existing.fat100
    }
  }
  if (protein === null || fat === null) return null

  const carbs = finiteMacro(seed.carbs100)
    ? seed.carbs100
    : existing && finiteMacro(existing.carbs100)
      ? existing.carbs100
      : 0
  const impact = isCholesterolImpact(seed.cholesterolImpact)
    ? seed.cholesterolImpact
    : 'unknown'
  const reason = loggedCatalogRussianReason(seed.cholesterolReasonRu)
  return {
    nameRu: seed.nameRu,
    nameEn: seed.nameEn,
    kcal100: seed.kcal100,
    protein100: protein,
    fat100: fat,
    carbs100: carbs,
    cholesterolImpact: impact,
    cholesterolReason: reason,
  }
}

function slugId(nameEn: string): string {
  const ascii = nameEn
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `logged-${ascii || 'food'}`
}

function uniqueId(nameEn: string, used: Set<string>): string {
  const base = slugId(nameEn)
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  const id = `${base}-${n}`
  used.add(id)
  return id
}

function sameLoggedFood(food: FoodItem, row: ResolvedLoggedCatalogFood): boolean {
  return (
    food.kcal100 === row.kcal100 &&
    food.protein100 === row.protein100 &&
    food.fat100 === row.fat100 &&
    food.carbs100 === row.carbs100 &&
    food.cholesterolImpact === row.cholesterolImpact &&
    food.cholesterolReason === row.cholesterolReason
  )
}

/**
 * Puts each resolved food on the catalog. An exact Russian name is
 * updated in place (same id, servings, and English label). A skipped
 * seed is left out. A second call changes nothing.
 */
export function mergeLoggedCatalogFoods(
  catalog: readonly FoodItem[],
): FoodItem[] {
  const foods = catalog.map((food) => ({ ...food }))
  const usedIds = new Set(foods.map((food) => food.id))
  for (const seed of LOGGED_CATALOG_SEEDS) {
    const row = resolveLoggedCatalogSeed(seed, catalog)
    if (!row) continue
    const index = foods.findIndex((food) => food.ru === row.nameRu)
    if (index === -1) {
      foods.push({
        id: uniqueId(row.nameEn, usedIds),
        en: row.nameEn,
        ru: row.nameRu,
        kcal100: row.kcal100,
        protein100: row.protein100,
        fat100: row.fat100,
        carbs100: row.carbs100,
        cholesterolImpact: row.cholesterolImpact,
        cholesterolReason: row.cholesterolReason,
      })
      continue
    }
    const existing = foods[index]
    if (!existing || sameLoggedFood(existing, row)) continue
    foods[index] = {
      ...existing,
      kcal100: row.kcal100,
      protein100: row.protein100,
      fat100: row.fat100,
      carbs100: row.carbs100,
      cholesterolImpact: row.cholesterolImpact,
      cholesterolReason: row.cholesterolReason,
    }
  }
  return foods
}
