import {
  calorieEntryProtein,
  totalCalories,
  totalCarbs,
  totalFat,
  totalFiber,
  totalMagnesium,
  totalPotassium,
  totalProtein,
  totalSodium,
  totalWaterMl,
} from '@/domain/dailyEntry'
import type { CalorieEntry, DayTotals, WaterEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'

/**
 * #663 — small, positive-reinforcement facts surfaced when a meal or day's
 * logged nutrition matches a widely-cited guideline (e.g. "20g+ protein in
 * one meal supports muscle protein synthesis", "≤2300mg sodium/day"). Every
 * threshold below is a real, commonly-cited number, not invented — see the
 * issue for the per-fact reasoning. Deliberately excludes anything the data
 * model doesn't track (vitamins, fruit/veg variety) rather than guessing.
 */
export type NutritionFactId =
  | 'proteinRichMeal'
  | 'excellentFiberMeal'
  | 'balancedPlateMeal'
  | 'highQualityCarbsMeal'
  | 'dailyFiberGoal'
  | 'sodiumConsciousDay'
  | 'potassiumRichDay'
  | 'goodPotassiumSodiumRatio'
  | 'magnesiumRichDay'
  | 'wellHydrated'
  | 'onTargetCalories'
  | 'proteinSpreadThroughDay'
  | 'balancedDay'

/** The 4 facts a single meal (not yet necessarily saved as a CalorieEntry)
 * can satisfy on its own — used by the meal-composition screen. */
export const PER_MEAL_NUTRITION_FACT_IDS: readonly NutritionFactId[] = [
  'proteinRichMeal',
  'excellentFiberMeal',
  'balancedPlateMeal',
  'highQualityCarbsMeal',
]

export interface MealNutritionTotals {
  proteinG: number
  fatG: number
  carbsG: number
  fiberG: number
}

interface MacroSplit {
  proteinG: number
  fatG: number
  carbsG: number
}

/** ~25/30/45 split (protein/fat/carbs by calories), the commonly-cited
 * "balanced plate" range the issue's own example (50% carbs/30% protein/
 * 20% fat) falls within. Requires all three macros to actually contribute
 * calories — an all-zero split isn't "balanced", it's empty. */
function isBalancedMacroSplit({ proteinG, fatG, carbsG }: MacroSplit): boolean {
  const macroKcal = proteinG * 4 + fatG * 9 + carbsG * 4
  if (macroKcal <= 0) return false
  const proteinPct = ((proteinG * 4) / macroKcal) * 100
  const fatPct = ((fatG * 9) / macroKcal) * 100
  const carbPct = ((carbsG * 4) / macroKcal) * 100
  return (
    proteinPct >= 25 &&
    proteinPct <= 35 &&
    fatPct >= 20 &&
    fatPct <= 35 &&
    carbPct >= 45 &&
    carbPct <= 55
  )
}

/** Evaluates the 4 per-meal facts against one meal's macro totals — reused
 * by the meal-composition screen, Day meal cards (#797), and AddMealDialog
 * inline praise. */
export function evaluateMealNutritionFacts(
  totals: MealNutritionTotals,
): NutritionFactId[] {
  const facts: NutritionFactId[] = []
  if (totals.proteinG >= 20) facts.push('proteinRichMeal')
  if (totals.fiberG >= 5) facts.push('excellentFiberMeal')
  if (isBalancedMacroSplit(totals)) facts.push('balancedPlateMeal')
  if (totals.carbsG >= 5 && totals.fiberG >= totals.carbsG * 0.1) {
    facts.push('highQualityCarbsMeal')
  }
  return facts
}

export interface DayNutritionFactsInput {
  calorieEntries?: CalorieEntry[]
  dayTotals?: DayTotals
  waterEntries?: WaterEntry[]
  goal?: Goal
}

/** Evaluates the 9 day-level facts for the Day screen card. Per-meal
 * facts (protein-rich, fiber, balanced plate, high-fiber carbs) belong
 * on that meal (#797), not in this list. */
export function evaluateDayNutritionFacts(
  input: DayNutritionFactsInput,
): NutritionFactId[] {
  const { calorieEntries, dayTotals, waterEntries, goal } = input
  const facts = new Set<NutritionFactId>()

  const fiberG = totalFiber(calorieEntries, dayTotals)
  if (fiberG !== undefined && fiberG >= 25) facts.add('dailyFiberGoal')

  const sodiumMg = totalSodium(calorieEntries)
  if (sodiumMg !== undefined && sodiumMg <= 2300) facts.add('sodiumConsciousDay')

  const potassiumMg = totalPotassium(calorieEntries)
  if (potassiumMg !== undefined && potassiumMg >= 3500) facts.add('potassiumRichDay')

  if (
    potassiumMg !== undefined &&
    sodiumMg !== undefined &&
    sodiumMg > 0 &&
    potassiumMg >= sodiumMg
  ) {
    facts.add('goodPotassiumSodiumRatio')
  }

  const magnesiumMg = totalMagnesium(calorieEntries)
  if (magnesiumMg !== undefined && magnesiumMg >= 300) facts.add('magnesiumRichDay')

  const waterMl = totalWaterMl(waterEntries)
  if (waterMl !== undefined && waterMl >= 2000) facts.add('wellHydrated')

  const kcal = totalCalories(calorieEntries, dayTotals)
  if (kcal !== undefined && goal?.dailyCalorieTargetKcal) {
    const target = goal.dailyCalorieTargetKcal
    if (kcal >= target * 0.9 && kcal <= target * 1.1) facts.add('onTargetCalories')
  }

  const proteinG = totalProtein(calorieEntries, dayTotals)
  const fatG = totalFat(calorieEntries, dayTotals)
  const carbsG = totalCarbs(calorieEntries, dayTotals)
  if (proteinG !== undefined && fatG !== undefined && carbsG !== undefined) {
    if (isBalancedMacroSplit({ proteinG, fatG, carbsG })) {
      facts.add('balancedDay')
    }
  }

  const mealsWithHighProtein = (calorieEntries ?? []).filter(
    (entry) => (calorieEntryProtein(entry) ?? 0) >= 20,
  ).length
  if (mealsWithHighProtein >= 2) facts.add('proteinSpreadThroughDay')

  return Array.from(facts)
}
