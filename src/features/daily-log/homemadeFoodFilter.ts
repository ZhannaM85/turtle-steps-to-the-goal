import type { PickableItem } from './addMealDialogHelpers'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'

/** Catalog dishes marked homemade (#994). Curated foods and recipes are not. */
export function isHomemadePickableItem(item: PickableItem): boolean {
  return item.source === 'mealItem' && item.mealItem.homemade === true
}

export function filterToHomemadeDishes(
  items: PickableItem[],
  homemadeOnly: boolean,
): PickableItem[] {
  if (!homemadeOnly) return items
  return items.filter(isHomemadePickableItem)
}

export function catalogHomemadeForName(
  name: string,
  items: readonly { name: string; homemade?: boolean }[],
): boolean {
  const trimmed = normalizeTextSpaces(name).trim()
  if (!trimmed) return false
  return items.some(
    (item) =>
      normalizeTextSpaces(item.name).trim() === trimmed &&
      item.homemade === true,
  )
}
