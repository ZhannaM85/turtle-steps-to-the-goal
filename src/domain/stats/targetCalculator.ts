import { estimatedWeeklyLossKgFromDailyDeficitKcal } from '@/domain/goal'
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
  return {
    calorieTargetKcal,
    ...suggestMacrosForCalorieTarget(weightKg, calorieTargetKcal),
  }
}

/**
 * Macro split for an already-chosen calorie target (#558) — same fixed
 * g/kg protein/fat ratios and carb remainder as {@link suggestDailyTargets},
 * without changing the calorie number itself.
 */
export function suggestMacrosForCalorieTarget(
  weightKg: number,
  calorieTargetKcal: number,
): Pick<
  SuggestedDailyTargets,
  'proteinTargetG' | 'fatTargetG' | 'carbTargetG'
> {
  const proteinTargetG = Math.round(weightKg * PROTEIN_G_PER_KG_BODYWEIGHT)
  const fatTargetG = Math.round(weightKg * FAT_G_PER_KG_BODYWEIGHT)
  const proteinKcal = proteinTargetG * KCAL_PER_G_PROTEIN
  const fatKcal = fatTargetG * KCAL_PER_G_FAT
  const carbTargetG = Math.max(
    0,
    Math.round((calorieTargetKcal - proteinKcal - fatKcal) / KCAL_PER_G_CARB),
  )
  return { proteinTargetG, fatTargetG, carbTargetG }
}

/**
 * Rough weekly kg-to-lose pace implied by a daily calorie target vs TDEE
 * (#558). Positive = deficit / loss; negative = surplus / gain. Callers
 * clamp or convert to the Goal form's display unit; never auto-saved.
 */
export function estimateWeeklyLossKgFromCalorieTarget(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel,
  calorieTargetKcal: number,
): number {
  const bmr = calculateBmr(weightKg, heightCm, age, sex)
  const tdee = calculateTdee(bmr, activityLevel)
  // Match suggestDailyTargets' rounded maintenance calorie so a round-trip
  // (suggest → estimate) lands near the same weekly pace.
  const dailyDeficitKcal = Math.round(tdee) - calorieTargetKcal
  return estimatedWeeklyLossKgFromDailyDeficitKcal(dailyDeficitKcal)
}

export type MacroRecalcAnchor = 'protein' | 'fat' | 'carbs'

function suggestedProteinG(weightKg: number): number {
  return Math.round(weightKg * PROTEIN_G_PER_KG_BODYWEIGHT)
}

function suggestedFatG(weightKg: number): number {
  return Math.round(weightKg * FAT_G_PER_KG_BODYWEIGHT)
}

export function calorieKcalFromMacros(
  proteinG: number,
  fatG: number,
  carbG: number,
): number {
  return Math.round(
    proteinG * KCAL_PER_G_PROTEIN +
      fatG * KCAL_PER_G_FAT +
      carbG * KCAL_PER_G_CARB,
  )
}

function carbsFromCalorieRemainder(
  calorieTargetKcal: number,
  proteinG: number,
  fatG: number,
): number {
  return Math.max(
    0,
    Math.round(
      (calorieTargetKcal -
        proteinG * KCAL_PER_G_PROTEIN -
        fatG * KCAL_PER_G_FAT) /
        KCAL_PER_G_CARB,
    ),
  )
}

/**
 * #569 — reverse recalc when a macro field is the user's anchor. Keeps the
 * anchored macro; fills missing protein/fat from the same g/kg defaults as
 * {@link suggestMacrosForCalorieTarget}; aligns calories (from macros or
 * keeps an existing calorie budget and fills carbs as the remainder).
 * Never auto-saved — callers prefill form fields only.
 */
export function suggestTargetsFromMacroAnchor(
  weightKg: number,
  anchor: MacroRecalcAnchor,
  proteinG: number,
  fatG: number | undefined,
  carbG: number | undefined,
  calorieTargetKcal: number | undefined,
): SuggestedDailyTargets {
  const proteinOut =
    anchor === 'protein'
      ? proteinG
      : proteinG > 0
        ? proteinG
        : suggestedProteinG(weightKg)
  const fatOut =
    anchor === 'fat'
      ? (fatG as number)
      : fatG !== undefined && fatG > 0
        ? fatG
        : suggestedFatG(weightKg)

  let calorieOut: number
  let carbOut: number

  if (anchor === 'carbs') {
    carbOut = carbG as number
    calorieOut = calorieKcalFromMacros(proteinOut, fatOut, carbOut)
  } else if (calorieTargetKcal !== undefined && calorieTargetKcal > 0) {
    calorieOut = calorieTargetKcal
    carbOut = carbsFromCalorieRemainder(calorieOut, proteinOut, fatOut)
  } else {
    carbOut = carbG !== undefined && carbG > 0 ? carbG : 0
    calorieOut = calorieKcalFromMacros(proteinOut, fatOut, carbOut)
  }

  return {
    calorieTargetKcal: calorieOut,
    proteinTargetG: proteinOut,
    fatTargetG: fatOut,
    carbTargetG: carbOut,
  }
}
