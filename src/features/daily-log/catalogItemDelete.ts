import type { DailyEntry } from '@/domain/dailyEntry'
import {
  countMealLibraryNameMatches,
  normalizeMealLibraryName,
} from '@/domain/mealItem'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore, useRecipeStore } from '@/stores'
import { itemKey, type PickableItem } from './addMealDialogHelpers'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export type MealSearchDeleteMode = 'duplicate' | 'item' | 'none'
export type MealSearchDeleteResult = 'deleted' | 'in-use' | 'none'

type CatalogRow = Extract<PickableItem, { source: 'mealItem' | 'recipe' }>

function isCatalogRow(item: PickableItem): item is CatalogRow {
  return item.source === 'mealItem' || item.source === 'recipe'
}

export function deletableCatalogCopies(
  item: PickableItem,
  hidden: readonly PickableItem[],
): CatalogRow[] {
  const keep = itemKey(item)
  return hidden.filter(
    (other): other is CatalogRow =>
      isCatalogRow(other) && itemKey(other) !== keep,
  )
}

/** #995 — extra catalog copy first; otherwise the row itself. Foods stay. */
export function mealSearchDeleteMode(
  item: PickableItem,
  hidden: readonly PickableItem[],
): MealSearchDeleteMode {
  if (deletableCatalogCopies(item, hidden).length > 0) return 'duplicate'
  if (item.source === 'food') return 'none'
  return 'item'
}

function catalogId(item: CatalogRow): string {
  return item.source === 'mealItem' ? item.mealItem.id : item.recipe.id
}

function catalogName(item: CatalogRow): string {
  return item.source === 'mealItem' ? item.mealItem.name : item.recipe.name
}

/**
 * Block only the last library dish/recipe whose name still appears on a
 * saved meal. Another catalog row with that name can go — history keeps
 * its own copy of the line, and the name is still in the library.
 */
export function isCatalogDeleteBlocked(
  item: CatalogRow,
  entries: readonly DailyEntry[],
  catalog: readonly { id: string; name: string }[],
): boolean {
  const name = catalogName(item)
  const key = normalizeMealLibraryName(name)
  if (!key) return false
  const id = catalogId(item)
  const others = catalog.some(
    (row) => row.id !== id && normalizeMealLibraryName(row.name) === key,
  )
  if (others) return false
  return countMealLibraryNameMatches(entries, name) > 0
}

function currentCatalog(): { id: string; name: string }[] {
  return [
    ...useMealItemStore.getState().items.map((row) => ({
      id: row.id,
      name: row.name,
    })),
    ...useRecipeStore.getState().recipes.map((row) => ({
      id: row.id,
      name: row.name,
    })),
  ]
}

async function removeCatalogRow(item: CatalogRow): Promise<void> {
  if (item.source === 'mealItem') {
    await useMealItemStore.getState().deleteItem(item.mealItem.id)
    return
  }
  await useRecipeStore.getState().deleteRecipe(item.recipe.id)
}

/**
 * #995 — remove hidden same-name copies, or the row itself when it is the
 * only catalog hit. Refuses the last row still named in meal history.
 */
export async function deleteMealSearchPickable(
  item: PickableItem,
  hidden: readonly PickableItem[],
): Promise<MealSearchDeleteResult> {
  const extras = deletableCatalogCopies(item, hidden)
  if (extras.length > 0) {
    for (const extra of extras) {
      await removeCatalogRow(extra)
    }
    return 'deleted'
  }
  if (!isCatalogRow(item)) return 'none'
  const entries = await dailyEntryRepository.getAll()
  if (isCatalogDeleteBlocked(item, entries, currentCatalog())) return 'in-use'
  await removeCatalogRow(item)
  return 'deleted'
}
