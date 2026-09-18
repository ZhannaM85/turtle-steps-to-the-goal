import { rankBySearchMatch } from '@/shared/lib/searchRank'

/** One past use of a brand, from the dish library or a logged meal (#969). */
export interface BrandOccurrence {
  brand: string
  usedAt: string
}

export function brandOccurrencesFromMealItems(
  items: readonly { brand?: string; updatedAt: string }[],
): BrandOccurrence[] {
  const occurrences: BrandOccurrence[] = []
  for (const item of items) {
    const brand = item.brand?.trim()
    if (brand) occurrences.push({ brand, usedAt: item.updatedAt })
  }
  return occurrences
}

export function brandOccurrencesFromDailyEntries(
  entries: readonly {
    date: string
    calorieEntries?: readonly {
      createdAt?: string
      items: readonly { brand?: string }[]
    }[]
  }[],
): BrandOccurrence[] {
  const occurrences: BrandOccurrence[] = []
  for (const entry of entries) {
    for (const meal of entry.calorieEntries ?? []) {
      const usedAt = meal.createdAt || entry.date
      for (const item of meal.items) {
        const brand = item.brand?.trim()
        if (brand) occurrences.push({ brand, usedAt })
      }
    }
  }
  return occurrences
}

/**
 * Dedupes by case-insensitive trimmed brand, keeps the most recently used
 * spelling, and ranks most-recent first, then most frequent.
 */
export function uniqueBrandsRanked(
  occurrences: readonly BrandOccurrence[],
): string[] {
  const byKey = new Map<
    string,
    { brand: string; usedAt: string; count: number }
  >()
  for (const occurrence of occurrences) {
    const brand = occurrence.brand.trim()
    if (!brand) continue
    const key = brand.toLowerCase()
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { brand, usedAt: occurrence.usedAt, count: 1 })
      continue
    }
    existing.count += 1
    if (occurrence.usedAt >= existing.usedAt) {
      existing.usedAt = occurrence.usedAt
      existing.brand = brand
    }
  }
  return [...byKey.values()]
    .sort(
      (a, b) =>
        b.usedAt.localeCompare(a.usedAt) ||
        b.count - a.count ||
        a.brand.localeCompare(b.brand),
    )
    .map((row) => row.brand)
}

/** Case-insensitive substring filter; empty/whitespace query returns all. */
export function filterBrandSuggestions(
  brands: readonly string[],
  query: string,
): string[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return [...brands]
  return rankBySearchMatch(
    brands.filter((brand) => brand.toLowerCase().includes(normalizedQuery)),
    normalizedQuery,
    (brand) => brand,
  )
}
