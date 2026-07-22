import { calculateBmr, type Sex } from './bodyComposition'

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'veryActive'

// Standard, widely-published Harris-Benedict/Mifflin-St Jeor activity
// multipliers — sedentary (little/no exercise) through very active
// (hard exercise + physical job).
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel]
}

// Fixed g/kg-bodyweight ratios (#259) — commonly-cited defaults for a
// weight-loss context (higher protein to help preserve lean mass), not a
// personalized/medical recommendation. Carbs fill whatever's left of the
// calorie budget after protein/fat, never negative.
const PROTEIN_G_PER_KG_BODYWEIGHT = 1.6
const FAT_G_PER_KG_BODYWEIGHT = 0.8
const KCAL_PER_G_PROTEIN = 4
const KCAL_PER_G_FAT = 9
const KCAL_PER_G_CARB = 4

export interface SuggestedDailyTargets {
  calorieTargetKcal: number
  proteinTargetG: number
  fatTargetG: number
  carbTargetG: number
}

/**
 * Deterministic, non-medical-advice suggestion (#259) — same "plain
 * arithmetic, clearly a rough estimate" convention as
 * `domain/goal/calorieDeficit.ts`'s existing ~7700 kcal/kg figure. TDEE
 * (Mifflin-St Jeor BMR × an activity multiplier) minus the caller-supplied
 * daily deficit (from the weekly-loss-pace target, if any — 0 for a plain
 * maintenance estimate) gives the calorie target; protein/fat use fixed
 * g/kg-bodyweight ratios; carbs fill the remainder. Never auto-applied —
 * callers prefill form fields with this and let the user review/edit
 * before saving, same as everywhere else in the app that suggests a value.
 */
export function suggestDailyTargets(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel,
  dailyDeficitKcal: number,
): SuggestedDailyTargets {
  const bmr = calculateBmr(weightKg, heightCm, age, sex)
  const tdee = calculateTdee(bmr, activityLevel)
  const calorieTargetKcal = Math.round(Math.max(0, tdee - dailyDeficitKcal))

  const proteinTargetG = Math.round(weightKg * PROTEIN_G_PER_KG_BODYWEIGHT)
  const fatTargetG = Math.round(weightKg * FAT_G_PER_KG_BODYWEIGHT)
  const proteinKcal = proteinTargetG * KCAL_PER_G_PROTEIN
  const fatKcal = fatTargetG * KCAL_PER_G_FAT
  const carbTargetG = Math.max(
    0,
    Math.round((calorieTargetKcal - proteinKcal - fatKcal) / KCAL_PER_G_CARB),
  )

  return { calorieTargetKcal, proteinTargetG, fatTargetG, carbTargetG }
}
