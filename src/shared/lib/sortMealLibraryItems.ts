/**
 * Settings → Dishes (#684) list order.
 * Default `title-asc` matches the repository's historical `orderBy('name')`.
 */
export type MealLibrarySort =
  | 'title-asc'
  | 'title-desc'
  | 'added-newest'
  | 'added-oldest'

export const MEAL_LIBRARY_SORT_OPTIONS: readonly MealLibrarySort[] = [
  'title-asc',
  'title-desc',
  'added-newest',
  'added-oldest',
]

export function isMealLibrarySort(value: string): value is MealLibrarySort {
  return (MEAL_LIBRARY_SORT_OPTIONS as readonly string[]).includes(value)
}

/** #684 — stable sort for Settings → Dishes (title or date added). */
export function sortMealLibraryItems<
  T extends { name: string; createdAt: string },
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
    }
  })
  return copy
}
