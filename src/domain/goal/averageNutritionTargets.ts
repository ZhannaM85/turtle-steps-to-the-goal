import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { goalCoveringDate } from '@/domain/goal'

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export interface PeriodNutritionTargets {
  averageCalorieTargetKcal: number | null
  averageProteinTargetG: number | null
  averageFatTargetG: number | null
  averageCarbTargetG: number | null
}

/**
 * #897 — average daily nutrition targets for days in `entries`, using the
 * Goal that covered each day (`goalCoveringDate`). Days with no covering
 * goal or unset target are skipped for that nutrient.
 */
export function averageNutritionTargetsForEntries(
  entries: DailyEntry[],
  goals: Goal[],
): PeriodNutritionTargets {
  if (goals.length === 0 || entries.length === 0) {
    return {
      averageCalorieTargetKcal: null,
      averageProteinTargetG: null,
      averageFatTargetG: null,
      averageCarbTargetG: null,
    }
  }
  const calorieTargets: number[] = []
  const proteinTargets: number[] = []
  const fatTargets: number[] = []
  const carbTargets: number[] = []
  for (const entry of entries) {
    const goal = goalCoveringDate(goals, entry.date)
    if (!goal) continue
    if (goal.dailyCalorieTargetKcal !== undefined) {
      calorieTargets.push(goal.dailyCalorieTargetKcal)
    }
    if (goal.dailyProteinTargetG !== undefined) {
      proteinTargets.push(goal.dailyProteinTargetG)
    }
    if (goal.dailyFatTargetG !== undefined) {
      fatTargets.push(goal.dailyFatTargetG)
    }
    if (goal.dailyCarbTargetG !== undefined) {
      carbTargets.push(goal.dailyCarbTargetG)
    }
  }
  return {
    averageCalorieTargetKcal: average(calorieTargets),
    averageProteinTargetG: average(proteinTargets),
    averageFatTargetG: average(fatTargets),
    averageCarbTargetG: average(carbTargets),
  }
}
