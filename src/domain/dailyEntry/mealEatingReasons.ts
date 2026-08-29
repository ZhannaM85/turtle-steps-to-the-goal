import {
  EATING_REASONS,
  isBuiltInEatingReason,
  type CalorieEntry,
} from './DailyEntry'

export type MealEatingReasonFields = Pick<
  CalorieEntry,
  'eatingReason' | 'eatingReasons'
>

function uniqueNonEmpty(reasons: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const reason of reasons) {
    const trimmed = reason.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

/** Built-ins in HALT-then-habit order, then customs in the order given. */
export function orderEatingReasons(reasons: string[]): string[] {
  const unique = uniqueNonEmpty(reasons)
  const selected = new Set(unique)
  const builtIns = EATING_REASONS.filter((reason) => selected.has(reason))
  const customs = unique.filter((reason) => !isBuiltInEatingReason(reason))
  return [...builtIns, ...customs]
}

/**
 * #774 — prefer `eatingReasons` when present; otherwise the legacy single
 * `eatingReason` from #764. Empty / unset is `[]`.
 */
export function mealEatingReasons(meal: MealEatingReasonFields): string[] {
  const fromList = uniqueNonEmpty(meal.eatingReasons ?? [])
  if (fromList.length > 0) return orderEatingReasons(fromList)
  if (meal.eatingReason?.trim()) return [meal.eatingReason.trim()]
  return []
}

/**
 * Writes both fields so old backups still see `eatingReason` (first pick)
 * and a single-reason meal stays identical to #764.
 */
export function applyEatingReasons<T extends MealEatingReasonFields>(
  meal: T,
  reasons: string[],
): T {
  const next = orderEatingReasons(reasons)
  if (next.length === 0) {
    return { ...meal, eatingReason: undefined, eatingReasons: undefined }
  }
  if (next.length === 1) {
    return { ...meal, eatingReason: next[0], eatingReasons: undefined }
  }
  return { ...meal, eatingReason: next[0], eatingReasons: next }
}
