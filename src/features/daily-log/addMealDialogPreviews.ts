import type { CalorieItem } from '@/domain/dailyEntry'
import { evaluateMealNutritionFacts, type NutritionFactId } from '@/domain/nutritionFacts'
import type { Dictionary, Locale } from '@/i18n'
import { formatNumber } from '@/i18n'
import {
  formatKcal,
  macrosSummaryTextCompact,
} from '@/shared/lib/macroDisplay'
import {
  parseOptionalMacro,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import type { ManualDraft } from './addMealDialogHelpers'

export function mealTotalsSoFar(items: CalorieItem[]) {
  return items.reduce(
    (sum, item) => ({
      kcal: sum.kcal + item.amountKcal,
      proteinG: sum.proteinG + (item.proteinG ?? 0),
      fatG: sum.fatG + (item.fatG ?? 0),
      carbsG: sum.carbsG + (item.carbsG ?? 0),
      fiberG: sum.fiberG + (item.fiberG ?? 0),
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 },
  )
}

export function addMealDialogPreviews({
  items,
  todayTotals,
  dailyCalorieTargetKcal,
  alreadySatisfiedFactIds,
  nutritionFactsEnabled,
  isConfirmingPick,
  manualDraft,
  t,
  locale,
}: {
  items: CalorieItem[]
  todayTotals?: {
    kcal: number
    proteinG: number
    fatG: number
    carbsG: number
  }
  dailyCalorieTargetKcal?: number
  alreadySatisfiedFactIds?: NutritionFactId[]
  nutritionFactsEnabled: boolean
  isConfirmingPick: boolean
  manualDraft: ManualDraft
  t: Dictionary
  locale: Locale
}) {
  const totalsSoFar = mealTotalsSoFar(items)
  const newlySatisfiedFactIds = nutritionFactsEnabled
    ? evaluateMealNutritionFacts(totalsSoFar).filter(
        (id) => !alreadySatisfiedFactIds?.includes(id),
      )
    : []
  const todayTotalPreview = todayTotals
    ? t.dailyEntry.todayWouldBeLabel(
        `${formatNumber(todayTotals.kcal + totalsSoFar.kcal, locale, 0)} ${t.dailyEntry.kcalUnit}`,
        `${formatNumber(todayTotals.kcal, locale, 0)} ${t.dailyEntry.kcalUnit}`,
      )
    : null
  const todayRemainingPreview =
    todayTotals !== undefined && dailyCalorieTargetKcal !== undefined
      ? t.dailyEntry.todayRemainingWouldBeLabel(
          formatKcal(
            dailyCalorieTargetKcal - (todayTotals.kcal + totalsSoFar.kcal),
            locale,
            t,
          ),
          formatKcal(dailyCalorieTargetKcal - todayTotals.kcal, locale, t),
        )
      : null
  const amountNum = parseNumberInput(manualDraft.amount)
  const pickedScaled =
    isConfirmingPick && amountNum && amountNum > 0
      ? manualDraft.macroMode === 'per100g'
        ? scaleFromPer100g(
            amountNum,
            parseOptionalMacro(manualDraft.protein),
            parseOptionalMacro(manualDraft.fat),
            parseOptionalMacro(manualDraft.carbs),
            manualDraft.amountG,
          )
        : totalFromPortion(
            amountNum,
            parseOptionalMacro(manualDraft.protein),
            parseOptionalMacro(manualDraft.fat),
            parseOptionalMacro(manualDraft.carbs),
            manualDraft.amountG,
          )
      : null
  const sheetTodayTotalPreview =
    pickedScaled && todayTotals
      ? t.dailyEntry.todayWouldBeLabel(
          `${formatNumber(todayTotals.kcal + totalsSoFar.kcal + pickedScaled.amountKcal, locale, 0)} ${t.dailyEntry.kcalUnit} · ${macrosSummaryTextCompact(
            todayTotals.proteinG + totalsSoFar.proteinG + (pickedScaled.proteinG ?? 0),
            todayTotals.fatG + totalsSoFar.fatG + (pickedScaled.fatG ?? 0),
            todayTotals.carbsG + totalsSoFar.carbsG + (pickedScaled.carbsG ?? 0),
            locale,
            t,
          )}`,
          `${formatNumber(todayTotals.kcal, locale, 0)} ${t.dailyEntry.kcalUnit} · ${macrosSummaryTextCompact(
            todayTotals.proteinG,
            todayTotals.fatG,
            todayTotals.carbsG,
            locale,
            t,
          )}`,
        )
      : (todayTotalPreview ?? undefined)
  const sheetTodayRemainingPreview =
    pickedScaled &&
    todayTotals !== undefined &&
    dailyCalorieTargetKcal !== undefined
      ? t.dailyEntry.todayRemainingWouldBeLabel(
          formatKcal(
            dailyCalorieTargetKcal -
              (todayTotals.kcal + totalsSoFar.kcal + pickedScaled.amountKcal),
            locale,
            t,
          ),
          formatKcal(dailyCalorieTargetKcal - todayTotals.kcal, locale, t),
        )
      : (todayRemainingPreview ?? undefined)
  return {
    newlySatisfiedFactIds,
    todayTotalPreview,
    todayRemainingPreview,
    sheetTodayTotalPreview,
    sheetTodayRemainingPreview,
  }
}
