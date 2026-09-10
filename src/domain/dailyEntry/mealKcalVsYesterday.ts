/**
 * #836 — Day meal-card kcal delta vs yesterday, matched by display label
 * (type/name), not by clock time. Same-label meals pair in order of
 * appearance; a meal with no nth same-label counterpart yesterday has no
 * delta. Equal kcal is treated as "no arrow."
 */
export function mealKcalDeltasByLabel(
  today: readonly { label: string; kcal: number }[],
  yesterday: readonly { label: string; kcal: number }[],
): Array<number | null> {
  const yesterdayByLabel = new Map<string, number[]>()
  for (const meal of yesterday) {
    const list = yesterdayByLabel.get(meal.label)
    if (list) list.push(meal.kcal)
    else yesterdayByLabel.set(meal.label, [meal.kcal])
  }

  const seen = new Map<string, number>()
  return today.map((meal) => {
    const index = seen.get(meal.label) ?? 0
    seen.set(meal.label, index + 1)
    const priors = yesterdayByLabel.get(meal.label)
    if (!priors || index >= priors.length) return null
    const delta = meal.kcal - priors[index]
    return delta === 0 ? null : delta
  })
}
