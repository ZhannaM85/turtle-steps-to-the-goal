/**
 * Settings → Dishes (#684) list order.
 * Default `title-asc` matches the repository's historical `orderBy('name')`.
 */
export type MealLibrarySort =
  | 'title-asc'
  | 'title-desc'
  | 'added-newest'
  | 'added-oldest'
  | 'eaten-newest'
  | 'eaten-oldest'

export const MEAL_LIBRARY_SORT_OPTIONS: readonly MealLibrarySort[] = [
  'title-asc',
  'title-desc',
  'added-newest',
  'added-oldest',
  'eaten-newest',
  'eaten-oldest',
]

export function isMealLibrarySort(value: string): value is MealLibrarySort {
  return (MEAL_LIBRARY_SORT_OPTIONS as readonly string[]).includes(value)
}

/** Foods with no diary day sort after every food that has one (#1111). */
function compareLastEaten(
  a: { lastEatenOn?: string },
  b: { lastEatenOn?: string },
  direction: 'newest' | 'oldest',
): number {
  if (!a.lastEatenOn && !b.lastEatenOn) return 0
  if (!a.lastEatenOn) return 1
  if (!b.lastEatenOn) return -1
  const cmp = a.lastEatenOn.localeCompare(b.lastEatenOn)
  return direction === 'oldest' ? cmp : -cmp
}

/** #684 / #1111 — stable sort for Settings → Dishes. */
export function sortMealLibraryItems<
  T extends { name: string; createdAt: string; lastEatenOn?: string },
>(items: readonly T[], sort: MealLibrarySort, locale: string): T[] {
  const copy = [...items]
  copy.sort((a, b) => {
    switch (sort) {
      case 'title-asc':
        return a.name.localeCompare(b.name, locale, { sensitivity: 'base' })
      case 'title-desc':
        return b.name.localeCompare(a.name, locale, { sensitivity: 'base' })
      case 'added-newest':
        return b.createdAt.localeCompare(a.createdAt)
      case 'added-oldest':
        return a.createdAt.localeCompare(b.createdAt)
      case 'eaten-newest':
        return compareLastEaten(a, b, 'newest')
      case 'eaten-oldest':
        return compareLastEaten(a, b, 'oldest')
    }
  })
  return copy
}
