/**
 * #836 — Day meal-card kcal delta vs one prior day's meals, matched by
 * display label (type/name), not by clock time. Same-label meals pair in
 * order of appearance; a meal with no nth same-label counterpart on that
 * day has no delta. Equal kcal is treated as "no arrow." A missing meal
 * is not a zero baseline.
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

export interface LabeledMealKcal {
  label: string
  kcal: number
}

/** One earlier day's meals, already in display order. */
export interface DatedMealKcalDay {
  date: string
  meals: readonly LabeledMealKcal[]
}

export interface MealKcalComparison {
  /** Today minus the paired prior meal. Null when there is no line to show. */
  delta: number | null
  /** ISO date of that prior day. Null when `delta` is null. */
  baselineDate: string | null
}

const NO_MEAL_COMPARISON: MealKcalComparison = {
  delta: null,
  baselineDate: null,
}

/**
 * #977 — for each meal label, compare with the most recent day before
 * `beforeDate` that has that same label. Yesterday wins when it has the
 * meal. A later duplicate with no counterpart on that day stays unmatched
 * (an older day is not used to fill the gap). No prior occurrence at all
 * omits the delta.
 */
export function mealKcalDeltasVsLastSameLabel(
  today: readonly LabeledMealKcal[],
  priorDays: readonly DatedMealKcalDay[],
  beforeDate: string,
): MealKcalComparison[] {
  const latestByLabel = new Map<string, DatedMealKcalDay>()
  for (const day of priorDays) {
    if (day.date >= beforeDate) continue
    const labelsOnDay = new Set<string>()
    for (const meal of day.meals) labelsOnDay.add(meal.label)
    for (const label of labelsOnDay) {
      const current = latestByLabel.get(label)
      if (!current || day.date > current.date) latestByLabel.set(label, day)
    }
  }

  const indexesByLabel = new Map<string, number[]>()
  today.forEach((meal, index) => {
    const list = indexesByLabel.get(meal.label)
    if (list) list.push(index)
    else indexesByLabel.set(meal.label, [index])
  })

  const result: MealKcalComparison[] = today.map(() => ({
    ...NO_MEAL_COMPARISON,
  }))
  for (const [label, indexes] of indexesByLabel) {
    const day = latestByLabel.get(label)
    if (!day) continue
    const todayMeals = indexes.map((index) => today[index]!)
    const priors = day.meals.filter((meal) => meal.label === label)
    const deltas = mealKcalDeltasByLabel(todayMeals, priors)
    indexes.forEach((index, offset) => {
      const delta = deltas[offset] ?? null
      result[index] =
        delta === null
          ? { ...NO_MEAL_COMPARISON }
          : { delta, baselineDate: day.date }
    })
  }
  return result
}
