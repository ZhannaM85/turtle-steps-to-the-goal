import type { FoodItem } from '@/data/foods'
import {
  collapseCatalogName,
  type CatalogFoodImport,
} from './CatalogFoodImport'

function folded(name: string): string {
  return collapseCatalogName(name).toLowerCase()
}

/** Catalog `ru` when this name is already a row; otherwise the pasted name. */
export function canonicalCatalogName(
  nameRu: string,
  catalog: readonly { ru: string }[],
): string {
  const normalized = collapseCatalogName(nameRu)
  const exact = catalog.find((food) => collapseCatalogName(food.ru) === normalized)
  if (exact) return exact.ru
  const matches = catalog.filter((food) => folded(food.ru) === folded(normalized))
  if (matches.length === 1 && matches[0]) return matches[0].ru
  return normalized
}

function catalogIndex(
  catalog: readonly { ru: string }[],
  nameRu: string,
): number {
  const normalized = collapseCatalogName(nameRu)
  const exact = catalog.findIndex(
    (food) => collapseCatalogName(food.ru) === normalized,
  )
  if (exact !== -1) return exact
  const matches = catalog
    .map((food, index) => ({ food, index }))
    .filter(({ food }) => folded(food.ru) === folded(normalized))
  return matches.length === 1 && matches[0] ? matches[0].index : -1
}

function overlay(food: FoodItem, row: CatalogFoodImport): FoodItem {
  const next: FoodItem = {
    ...food,
    kcal100: row.kcal100,
    protein100: row.protein100,
    fat100: row.fat100,
    carbs100: row.carbs100,
    cholesterolImpact: row.cholesterolImpact,
  }
  if (row.cholesterolReason) next.cholesterolReason = row.cholesterolReason
  else delete next.cholesterolReason
  return next
}

function appendedFood(row: CatalogFoodImport): FoodItem {
  const food: FoodItem = {
    id: `user-catalog-${encodeURIComponent(row.nameRu)}`,
    en: row.nameEn ?? row.nameRu,
    ru: row.nameRu,
    kcal100: row.kcal100,
    protein100: row.protein100,
    fat100: row.fat100,
    carbs100: row.carbs100,
    cholesterolImpact: row.cholesterolImpact,
  }
  if (row.cholesterolReason) food.cholesterolReason = row.cholesterolReason
  return food
}

/**
 * #1015 — paste updates the catalog row with that Russian name. A name
 * the catalog does not have is appended once. An empty import list
 * returns the same array so existing search identity checks stay put.
 */
export function mergeCatalogFoodImports(
  catalog: readonly FoodItem[],
  imports: readonly CatalogFoodImport[],
): FoodItem[] {
  if (imports.length === 0) return catalog as FoodItem[]
  const next = catalog.slice()
  const consumed = new Set<number>()
  imports.forEach((row, importIndex) => {
    const index = catalogIndex(next, row.nameRu)
    if (index === -1) return
    consumed.add(importIndex)
    const current = next[index]
    if (current) next[index] = overlay(current, row)
  })
  imports.forEach((row, importIndex) => {
    if (consumed.has(importIndex)) return
    next.push(appendedFood(row))
  })
  return next
}
