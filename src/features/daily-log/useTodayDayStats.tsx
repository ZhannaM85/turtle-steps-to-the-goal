import type { DailyEntry } from '@/domain/dailyEntry'
import {
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
import type { Goal } from '@/domain/goal'
import { kgToLb } from '@/domain/goal'
import { calculateBmi, calculateBmr } from '@/domain/stats'
import { evaluateDayNutritionFacts } from '@/domain/nutritionFacts'
import {
  formatExactNumber,
  formatNumber,
  useLocale,
  useTranslation,
} from '@/i18n'
import { formatMacroGrams, formatMl } from '@/shared/lib/macroDisplay'
import {
  useNutritionFactsStore,
  useProfileStore,
  useUnitStore,
} from '@/stores'

export function useTodayDayStats({
  entry,
  goal,
  previousDayEntry,
  maxWeightKg,
}: {
  entry: DailyEntry | null
  goal: Goal | null
  previousDayEntry: DailyEntry | null
  maxWeightKg: number | null
}) {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)

  const weightDeltaKg =
    entry?.weightKg !== undefined && previousDayEntry?.weightKg !== undefined
      ? entry.weightKg - previousDayEntry.weightKg
      : null
  const weightDeltaText =
    weightDeltaKg === null
      ? null
      : formatExactNumber(toDisplay(weightDeltaKg), locale)
  const isWeightLoss = weightDeltaKg !== null && weightDeltaKg < 0
  const weightDeltaValue =
    weightDeltaText === null ? null : isWeightLoss ? (
      weightDeltaText
    ) : (
      <span className="text-2xl font-normal text-muted-foreground">
        {weightDeltaText}
      </span>
    )

  const vsMaxWeightKg =
    entry?.weightKg !== undefined && maxWeightKg !== null
      ? entry.weightKg - maxWeightKg
      : null
  const vsMaxWeightText =
    vsMaxWeightKg === null
      ? null
      : formatExactNumber(toDisplay(vsMaxWeightKg), locale)
  const isBelowMaxWeight = vsMaxWeightKg !== null && vsMaxWeightKg < 0
  const vsMaxWeightValue =
    vsMaxWeightText === null ? null : isBelowMaxWeight ? (
      vsMaxWeightText
    ) : (
      <span className="text-2xl font-normal text-muted-foreground">
        {vsMaxWeightText}
      </span>
    )

  const consumedKcal = totalCalories(entry?.calorieEntries, entry?.dayTotals) ?? 0
  const remainingKcal =
    goal?.dailyCalorieTargetKcal !== undefined
      ? goal.dailyCalorieTargetKcal - consumedKcal
      : null
  const isOverCalorieBudget = remainingKcal !== null && remainingKcal < 0
  const consumedProteinG = totalProtein(entry?.calorieEntries, entry?.dayTotals) ?? 0
  const proteinDeltaG =
    goal?.dailyProteinTargetG !== undefined
      ? goal.dailyProteinTargetG - consumedProteinG
      : null
  const isOverProteinTarget = proteinDeltaG !== null && proteinDeltaG < 0
  const consumedFatG = totalFat(entry?.calorieEntries, entry?.dayTotals) ?? 0
  const fatDeltaG =
    goal?.dailyFatTargetG !== undefined
      ? goal.dailyFatTargetG - consumedFatG
      : null
  const isOverFatTarget = fatDeltaG !== null && fatDeltaG < 0
  const consumedCarbG = totalCarbs(entry?.calorieEntries, entry?.dayTotals) ?? 0
  const carbDeltaG =
    goal?.dailyCarbTargetG !== undefined
      ? goal.dailyCarbTargetG - consumedCarbG
      : null
  const isOverCarbTarget = carbDeltaG !== null && carbDeltaG < 0
  const consumedFiberG =
    totalFiber(entry?.calorieEntries, entry?.dayTotals) ?? 0
  const fiberDeltaG =
    goal?.dailyFiberTargetG !== undefined
      ? goal.dailyFiberTargetG - consumedFiberG
      : null
  const isOverFiberTarget = fiberDeltaG !== null && fiberDeltaG < 0
  const consumedSodiumMg = totalSodium(entry?.calorieEntries) ?? 0
  const sodiumDeltaMg =
    goal?.dailySodiumTargetMg !== undefined
      ? goal.dailySodiumTargetMg - consumedSodiumMg
      : null
  const isOverSodiumTarget = sodiumDeltaMg !== null && sodiumDeltaMg < 0
  const consumedPotassiumMg = totalPotassium(entry?.calorieEntries) ?? 0
  const potassiumDeltaMg =
    goal?.dailyPotassiumTargetMg !== undefined
      ? goal.dailyPotassiumTargetMg - consumedPotassiumMg
      : null
  const isOverPotassiumTarget =
    potassiumDeltaMg !== null && potassiumDeltaMg < 0
  const consumedMagnesiumMg = totalMagnesium(entry?.calorieEntries) ?? 0
  const magnesiumDeltaMg =
    goal?.dailyMagnesiumTargetMg !== undefined
      ? goal.dailyMagnesiumTargetMg - consumedMagnesiumMg
      : null
  const isOverMagnesiumTarget =
    magnesiumDeltaMg !== null && magnesiumDeltaMg < 0
  const proteinTargetText =
    goal?.dailyProteinTargetG !== undefined
      ? formatMacroGrams(goal.dailyProteinTargetG, locale, t)
      : null
  const fatTargetText =
    goal?.dailyFatTargetG !== undefined
      ? formatMacroGrams(goal.dailyFatTargetG, locale, t)
      : null
  const carbTargetText =
    goal?.dailyCarbTargetG !== undefined
      ? formatMacroGrams(goal.dailyCarbTargetG, locale, t)
      : null
  const fiberTargetText =
    goal?.dailyFiberTargetG !== undefined
      ? formatMacroGrams(goal.dailyFiberTargetG, locale, t)
      : null
  const formatMgAmount = (mg: number) =>
    `${formatNumber(mg, locale, 0)} ${t.dailyEntry.mgUnit}`
  const sodiumTargetText =
    goal?.dailySodiumTargetMg !== undefined
      ? formatMgAmount(goal.dailySodiumTargetMg)
      : null
  const potassiumTargetText =
    goal?.dailyPotassiumTargetMg !== undefined
      ? formatMgAmount(goal.dailyPotassiumTargetMg)
      : null
  const magnesiumTargetText =
    goal?.dailyMagnesiumTargetMg !== undefined
      ? formatMgAmount(goal.dailyMagnesiumTargetMg)
      : null
  const consumedWaterMl = totalWaterMl(entry?.waterEntries) ?? 0
  const waterDeltaMl =
    goal?.dailyWaterTargetMl !== undefined
      ? goal.dailyWaterTargetMl - consumedWaterMl
      : null
  const isOverWaterTarget = waterDeltaMl !== null && waterDeltaMl < 0
  const waterTargetText =
    goal?.dailyWaterTargetMl !== undefined
      ? formatMl(goal.dailyWaterTargetMl, locale, t)
      : null
  const caloriesPercent = goal?.dailyCalorieTargetKcal
    ? (consumedKcal / goal.dailyCalorieTargetKcal) * 100
    : null
  const proteinPercent = goal?.dailyProteinTargetG
    ? (consumedProteinG / goal.dailyProteinTargetG) * 100
    : null
  const fatPercent = goal?.dailyFatTargetG
    ? (consumedFatG / goal.dailyFatTargetG) * 100
    : null
  const carbPercent = goal?.dailyCarbTargetG
    ? (consumedCarbG / goal.dailyCarbTargetG) * 100
    : null
  const fiberPercent = goal?.dailyFiberTargetG
    ? (consumedFiberG / goal.dailyFiberTargetG) * 100
    : null
  const sodiumPercent = goal?.dailySodiumTargetMg
    ? (consumedSodiumMg / goal.dailySodiumTargetMg) * 100
    : null
  const potassiumPercent = goal?.dailyPotassiumTargetMg
    ? (consumedPotassiumMg / goal.dailyPotassiumTargetMg) * 100
    : null
  const magnesiumPercent = goal?.dailyMagnesiumTargetMg
    ? (consumedMagnesiumMg / goal.dailyMagnesiumTargetMg) * 100
    : null
  const waterPercent = goal?.dailyWaterTargetMl
    ? (consumedWaterMl / goal.dailyWaterTargetMl) * 100
    : null

  const { heightCm, age, sex } = useProfileStore()
  const bmiValue =
    entry?.weightKg !== undefined && heightCm !== undefined
      ? calculateBmi(entry.weightKg, heightCm)
      : null
  const bmrValue =
    entry?.weightKg !== undefined &&
    heightCm !== undefined &&
    age !== undefined &&
    sex !== undefined
      ? calculateBmr(entry.weightKg, heightCm, age, sex)
      : null
  const stepsValue = entry?.steps
  const sleepValue = entry?.sleepHours
  const deepSleepValue = entry?.deepSleepHours

  const nutritionFactsEnabled = useNutritionFactsStore((state) => state.enabled)
  const nutritionFacts = nutritionFactsEnabled
    ? evaluateDayNutritionFacts({
        calorieEntries: entry?.calorieEntries,
        dayTotals: entry?.dayTotals,
        waterEntries: entry?.waterEntries,
        goal: goal ?? undefined,
      })
    : []

  return {
    locale,
    displayUnit,
    toDisplay,
    weightDeltaValue,
    vsMaxWeightValue,
    consumedKcal,
    remainingKcal,
    isOverCalorieBudget,
    consumedProteinG,
    proteinDeltaG,
    isOverProteinTarget,
    consumedFatG,
    fatDeltaG,
    isOverFatTarget,
    consumedCarbG,
    carbDeltaG,
    isOverCarbTarget,
    consumedFiberG,
    fiberDeltaG,
    isOverFiberTarget,
    consumedSodiumMg,
    sodiumDeltaMg,
    isOverSodiumTarget,
    consumedPotassiumMg,
    potassiumDeltaMg,
    isOverPotassiumTarget,
    consumedMagnesiumMg,
    magnesiumDeltaMg,
    isOverMagnesiumTarget,
    proteinTargetText,
    fatTargetText,
    carbTargetText,
    fiberTargetText,
    formatMgAmount,
    sodiumTargetText,
    potassiumTargetText,
    magnesiumTargetText,
    consumedWaterMl,
    waterDeltaMl,
    isOverWaterTarget,
    waterTargetText,
    caloriesPercent,
    proteinPercent,
    fatPercent,
    carbPercent,
    fiberPercent,
    sodiumPercent,
    potassiumPercent,
    magnesiumPercent,
    waterPercent,
    bmiValue,
    bmrValue,
    stepsValue,
    sleepValue,
    deepSleepValue,
    nutritionFacts,
    showNutritionFacts: nutritionFacts.length > 0,
  }
}

export type TodayDayStats = ReturnType<typeof useTodayDayStats>
