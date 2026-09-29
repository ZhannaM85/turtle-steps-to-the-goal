import type { FoodItem } from '@/data/foods'
import {
  collapseCatalogName,
  normalizeCatalogBarcode,
  type CatalogFoodImport,
} from '@/domain/catalogFoodImport'
import type { PickableItem } from './addMealDialogHelpers'

function folded(name: string): string {
  return collapseCatalogName(name).toLowerCase()
}

function foodForImport(
  foods: readonly FoodItem[],
  row: CatalogFoodImport,
): FoodItem | undefined {
  const code = normalizeCatalogBarcode(row.barcode)
  if (code) {
    const byCode = foods.find(
      (food) => normalizeCatalogBarcode(food.barcode) === code,
    )
    if (byCode) return byCode
  }
  const name = folded(row.nameRu)
  if (!name) return undefined
  return foods.find((food) => folded(food.ru) === name)
}

function namesOf(item: PickableItem): string[] {
  if (item.source === 'mealItem') return [folded(item.mealItem.name)]
  if (item.source === 'food') {
    return [folded(item.food.ru), folded(item.food.en)]
  }
  return []
}

type Ranked = {
  item: PickableItem
  at: string
  diary: boolean
}

/**
 * #1035 / #1051 — «Недавние» mixes meal adds with Settings catalog
 * paste-imports on one clock. A meal add's time is the library row's
 * `updatedAt` (stamped when that food is saved onto a meal, including a
 * built-in catalog name). Import time is `CatalogFoodImport.updatedAt`
 * (last row in one paste is newest). The later event ranks higher. A
 * later log of the same name replaces that catalog row. Two diary rows
 * with the same name both stay.
 */
export function rankRecentMealPickables(input: {
  mealItems: readonly PickableItem[]
  foods: readonly FoodItem[]
  imports: readonly CatalogFoodImport[]
}): PickableItem[] {
  const ranked: Ranked[] = []
  for (const item of input.mealItems) {
    if (item.source !== 'mealItem') continue
    ranked.push({ item, at: item.mealItem.updatedAt, diary: true })
  }
  for (const row of input.imports) {
    const food = foodForImport(input.foods, row)
    if (!food) continue
    ranked.push({
      item: { source: 'food', food },
      at: row.updatedAt,
      diary: false,
    })
  }
  ranked.sort((a, b) => {
    const byTime = b.at.localeCompare(a.at)
    if (byTime !== 0) return byTime
    return Number(b.diary) - Number(a.diary)
  })

  const kept: PickableItem[] = []
  const catalogNames = new Set<string>()
  const anyNames = new Set<string>()
  for (const entry of ranked) {
    const names = namesOf(entry.item).filter((name) => name !== '')
    if (names.length === 0) continue
    if (entry.diary) {
      if (names.some((name) => catalogNames.has(name))) continue
      kept.push(entry.item)
      for (const name of names) anyNames.add(name)
      continue
    }
    if (names.some((name) => anyNames.has(name))) continue
    kept.push(entry.item)
    for (const name of names) {
      anyNames.add(name)
      catalogNames.add(name)
    }
  }
  return kept
}
