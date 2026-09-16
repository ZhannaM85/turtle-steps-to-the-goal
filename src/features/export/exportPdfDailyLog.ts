import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import {
  calorieEntryCarbs,
  calorieEntryFat,
  calorieEntryKcal,
  calorieEntryProtein,
  hadNightEating,
  mealEatingReasons,
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  totalWaterMl,
} from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import type { Sex } from '@/domain/stats'
import {
  formatLocalizedDate,
  formatNumber,
  unitLabel,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { formatEatingReasonsLine } from '@/shared/lib/eatingReasonDisplay'
import { formatKcal, macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { effectiveMealLabel, effectiveTimeEaten } from '@/shared/lib/mealLabel'
import { formatSleepDuration } from '@/shared/lib/sleepDuration'
import type { Unit } from '@/stores/unitStore'
import {
  type AnalysisExportTrackingGate,
  type DailyLogExportExtras,
} from './dailyLogExport'
import { pdfContentBottomMm } from './exportPdfFooter'

export interface DailyLogPdfInput {
  entries: DailyEntry[]
  extras?: DailyLogExportExtras
  sex?: Sex
}

export type DailyLogPdfLineRole = 'header' | 'section' | 'body' | 'item'

export interface DailyLogPdfLine {
  role: DailyLogPdfLineRole
  text: string
  kind?: 'sleep' | 'deepSleep' | 'steps' | 'mood' | 'meal' | 'dayTotal'
}

function trackingOn(
  extras: DailyLogExportExtras | undefined,
  key: keyof AnalysisExportTrackingGate,
): boolean {
  return extras?.tracking?.[key] !== false
}

function yesNo(value: boolean, t: Dictionary): string {
  return value
    ? t.dailyEntry.hadConstipationYesOption
    : t.dailyEntry.hadConstipationNoOption
}

function displayWeight(kg: number, unit: Unit): number {
  return unit === 'lb' ? kgToLb(kg) : kg
}

function joinParts(parts: Array<string | undefined>): string {
  return parts.filter((part) => part && part.length > 0).join('  ·  ')
}

function mealHeading(
  meal: CalorieEntry,
  position: number,
  t: Dictionary,
  locale: Locale,
  extras: DailyLogExportExtras | undefined,
): string {
  const kcal = calorieEntryKcal(meal)
  const macros = macrosSummaryTextCompact(
    calorieEntryProtein(meal),
    calorieEntryFat(meal),
    calorieEntryCarbs(meal),
    locale,
    t,
  )
  const reasons =
    trackingOn(extras, 'eatingReason') && mealEatingReasons(meal).length > 0
      ? formatEatingReasonsLine(
          mealEatingReasons(meal),
          t,
          extras?.eatingReasonLabelOverrides,
        )
      : undefined
  return joinParts([
    effectiveMealLabel(t, position, meal.label),
    effectiveTimeEaten(meal, extras?.mealSlotTimes),
    kcal !== undefined ? formatKcal(kcal, locale, t) : undefined,
    macros ?? undefined,
    reasons,
  ])
}

/**
 * `#891` — readable day blocks for optional PDF daily pages (not the
 * Excel/CSV spreadsheet columns).
 */
export function dailyLogPdfDayLines(
  entry: DailyEntry,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  extras?: DailyLogExportExtras,
): DailyLogPdfLine[] {
  const lines: DailyLogPdfLine[] = []
  const weight =
    entry.weightKg === undefined
      ? undefined
      : `${formatNumber(displayWeight(entry.weightKg, unit), locale)} ${unitLabel(unit, t)}`
  lines.push({
    role: 'header',
    text: joinParts([formatLocalizedDate(entry.date, locale), weight]),
  })

  const metrics: string[] = []
  if (trackingOn(extras, 'sleep')) {
    const sleep =
      entry.sleepHours === undefined
        ? undefined
        : `${t.dailyEntry.sleepHoursLabel}: ${formatSleepDuration(
            entry.sleepHours,
            t.dailyEntry.hoursUnit,
            t.dailyEntry.minutesUnit,
          )}`
    const deepSleep =
      entry.deepSleepHours === undefined
        ? undefined
        : `${t.dailyEntry.deepSleepLabel}: ${formatSleepDuration(
            entry.deepSleepHours,
            t.dailyEntry.hoursUnit,
            t.dailyEntry.minutesUnit,
          )}`
    if (sleep) lines.push({ role: 'body', text: sleep, kind: 'sleep' })
    if (deepSleep) lines.push({ role: 'body', text: deepSleep, kind: 'deepSleep' })
  }
  if (trackingOn(extras, 'steps') && entry.steps !== undefined) {
    lines.push({ role: 'body', text: `${t.dailyEntry.stepsLabel}: ${formatNumber(entry.steps, locale, 0)}`, kind: 'steps' })
  }
  if (trackingOn(extras, 'mood') && entry.emotion) {
    lines.push({ role: 'body', text: `${t.dailyEntry.dayMoodLabel}: ${t.dailyEntry.emotionLabel(entry.emotion)}`, kind: 'mood' })
  }
  if (trackingOn(extras, 'bodyMeasurements') && entry.waistCm !== undefined) {
    metrics.push(
      t.pdfSummary.waistLabel(
        formatNumber(entry.waistCm, locale),
        formatLocalizedDate(entry.date, locale),
      ),
    )
  }
  if (trackingOn(extras, 'bodyMeasurements') && entry.hipCm !== undefined) {
    metrics.push(
      t.pdfSummary.hipLabel(
        formatNumber(entry.hipCm, locale),
        formatLocalizedDate(entry.date, locale),
      ),
    )
  }
  if (trackingOn(extras, 'bodyComposition')) {
    const bodyComposition = [
      entry.muscleMassKg === undefined
        ? undefined
        : `${t.dailyEntry.muscleMassShortLabel}: ${formatNumber(entry.muscleMassKg, locale)} ${t.dailyEntry.kgUnit}`,
      entry.visceralFatRating === undefined
        ? undefined
        : `${t.dailyEntry.visceralFatShortLabel}: ${formatNumber(entry.visceralFatRating, locale)}`,
      entry.bodyWaterPercent === undefined
        ? undefined
        : `${t.dailyEntry.bodyWaterShortLabel}: ${formatNumber(entry.bodyWaterPercent, locale)}${t.dailyEntry.percentUnit}`,
      entry.boneMassKg === undefined
        ? undefined
        : `${t.dailyEntry.boneMassShortLabel}: ${formatNumber(entry.boneMassKg, locale)} ${t.dailyEntry.kgUnit}`,
      entry.bodyFatPercent === undefined
        ? undefined
        : `${t.dailyEntry.bodyFatShortLabel}: ${formatNumber(entry.bodyFatPercent, locale)}${t.dailyEntry.percentUnit}`,
    ].filter((value): value is string => value !== undefined)
    if (bodyComposition.length > 0) {
      metrics.push(
        `${t.dailyEntry.bodyCompositionLabel}: ${bodyComposition.join(' · ')}`,
      )
    }
  }
  if (trackingOn(extras, 'cycle') && entry.onPeriod !== undefined) {
    metrics.push(`${t.dailyEntry.onPeriodLabel}: ${yesNo(entry.onPeriod, t)}`)
  }
  if (trackingOn(extras, 'digestion') && entry.hadConstipation !== undefined) {
    metrics.push(
      `${t.dailyEntry.hadConstipationLabel}: ${yesNo(entry.hadConstipation, t)}`,
    )
  }
  if (trackingOn(extras, 'alcohol') && entry.hadAlcohol !== undefined) {
    metrics.push(
      `${t.dailyEntry.hadAlcoholLabel}: ${yesNo(entry.hadAlcohol, t)}`,
    )
  }
  if (trackingOn(extras, 'nightEating')) {
    const night = hadNightEating(entry)
    if (night !== undefined) {
      metrics.push(`${t.dailyEntry.nightEatingLabel()}: ${yesNo(night, t)}`)
      if (night && entry.nightEatingReason) {
        metrics.push(
          `${t.dailyEntry.nightEatingReasonLabel}: ${entry.nightEatingReason}`,
        )
      }
      if (!night) {
        const whatHelped =
          entry.nightEatingNoWhatHelped ?? entry.nightEatingNoThoughts
        if (whatHelped) {
          metrics.push(
            `${t.dailyEntry.nightEatingNoWhatHelpedLabel}: ${whatHelped}`,
          )
        }
      }
    }
  }
  for (const metric of extras?.customMetrics ?? []) {
    const logged = extras?.customMetricEntries?.find(
      (item) => item.metricId === metric.id && item.date === entry.date,
    )
    if (!logged) continue
    const value =
      metric.inputKind === 'boolean'
        ? yesNo(logged.value === 1, t)
        : metric.unit
          ? `${formatNumber(logged.value, locale)} ${metric.unit}`
          : formatNumber(logged.value, locale)
    metrics.push(joinParts([`${metric.name}: ${value}`, logged.note]))
  }
  if (metrics.length > 0) {
    lines.push({
      role: 'section',
      text: t.pdfSummary.dailyLogMetricsSectionTitle,
    })
    for (const metric of metrics) {
      lines.push({ role: 'body', text: metric })
    }
  }

  const meals = entry.calorieEntries ?? []
  const dayTotalKcal = totalCalories(meals, entry.dayTotals)
  if (meals.length > 0 || entry.dayTotals) {
    const consumedSummary =
      dayTotalKcal !== undefined && meals.length > 0
        ? joinParts([
            t.dailyEntry.consumedMacrosLabel,
            formatKcal(dayTotalKcal, locale, t),
            macrosSummaryTextCompact(
              totalProtein(meals, entry.dayTotals),
              totalFat(meals, entry.dayTotals),
              totalCarbs(meals, entry.dayTotals),
              locale,
              t,
            ) ?? undefined,
          ])
        : undefined
    lines.push({
      role: 'section',
      text: joinParts([t.pdfSummary.dailyLogFoodSectionTitle, consumedSummary]),
    })
    meals.forEach((meal, index) => {
      lines.push({
        role: 'body',
        text: mealHeading(meal, index + 1, t, locale, extras),
        kind: 'meal',
      })
      for (const item of meal.items) {
        const itemLine = joinParts([
          [item.name, item.brand].filter(Boolean).join(', ') || undefined,
          formatKcal(item.amountKcal, locale, t),
          item.noteText,
        ])
        if (itemLine) lines.push({ role: 'item', text: itemLine })
      }
      if (meal.note) lines.push({ role: 'item', text: meal.note })
    })
    if (entry.dayTotals) {
      lines.push({
        role: 'body',
        text: joinParts([
          t.dailyEntry.dayTotalsLabel,
          formatKcal(entry.dayTotals.amountKcal, locale, t),
        ]),
        kind: 'dayTotal',
      })
    }
  }

  if (trackingOn(extras, 'water')) {
    const total = totalWaterMl(entry.waterEntries)
    const sips = entry.waterEntries ?? []
    if (total !== undefined || sips.length > 0) {
      lines.push({ role: 'section', text: t.dailyEntry.waterLabel })
      if (total !== undefined) {
        lines.push({
          role: 'body',
          text: `${formatNumber(total, locale, 0)} ${t.dailyEntry.mlUnit}`,
        })
      }
      for (const sip of sips) {
        lines.push({
          role: 'item',
          text: joinParts([
            sip.timeDrunk,
            `${formatNumber(sip.amountMl, locale, 0)} ${t.dailyEntry.mlUnit}`,
          ]),
        })
      }
    }
  }

  const notes: string[] = []
  if (trackingOn(extras, 'morningNote') && entry.morningNote) {
    notes.push(`${t.dailyEntry.morningNoteLabel}: ${entry.morningNote}`)
  }
  if (trackingOn(extras, 'note') && entry.note) {
    notes.push(`${t.dailyEntry.noteLabel}: ${entry.note}`)
  }
  if (notes.length > 0) {
    lines.push({
      role: 'section',
      text: t.pdfSummary.dailyLogNotesSectionTitle,
    })
    for (const note of notes) {
      lines.push({ role: 'body', text: note })
    }
  }

  return lines
}

const MARGIN_X = 15
const LINE_MM: Record<DailyLogPdfLineRole, number> = {
  header: 7,
  section: 6,
  body: 5,
  item: 4.5,
}
const SIZE: Record<DailyLogPdfLineRole, number> = {
  header: 13,
  section: 11,
  body: 9,
  item: 8,
}

function contentBottom(
  doc: import('jspdf').jsPDF,
  t: Dictionary,
): number {
  return pdfContentBottomMm(doc, t, MARGIN_X)
}

function startPortraitPage(doc: import('jspdf').jsPDF): number {
  doc.addPage('a4', 'p')
  doc.setFont('PTSans')
  doc.setTextColor(0)
  return 16
}

/**
 * `#865` / `#891` — optional portrait diary pages after the one-page
 * summary. Excel/CSV keep the spreadsheet columns; these pages are for
 * reading one day at a time.
 */
export function appendDailyLogPdfPages(
  doc: import('jspdf').jsPDF,
  input: DailyLogPdfInput,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  startOnNewPage = true,
): void {
  const entries = [...input.entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  if (entries.length === 0) return

  let y = startOnNewPage ? startPortraitPage(doc) : 16
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - MARGIN_X * 2

  doc.setFontSize(13)
  doc.text(t.pdfSummary.dailyLogPagesTitle, MARGIN_X, y)
  y += 8

  for (const entry of entries) {
    const dayLines = dailyLogPdfDayLines(entry, t, locale, unit, input.extras)
    // Use the real wrapped height instead of a fixed minimum. The old 40 mm
    // estimate could send a compact day to a fresh page even when it fit in
    // the space remaining below the preceding day.
    const estimated = dayLines.reduce((sum, line) => {
      doc.setFontSize(SIZE[line.role])
      const wrapped = doc.splitTextToSize(
        line.text,
        line.role === 'item' ? maxWidth - 4 : maxWidth,
      ) as string[]
      return sum + wrapped.length * LINE_MM[line.role]
    }, 4)
    if (y > 24 && y + estimated > contentBottom(doc, t)) {
      y = startPortraitPage(doc)
    }

    for (const line of dayLines) {
      doc.setFontSize(SIZE[line.role])
      const wrapped = doc.splitTextToSize(
        line.text,
        line.role === 'item' ? maxWidth - 4 : maxWidth,
      ) as string[]
      const indent = line.role === 'item' ? 4 : 0
      for (const piece of wrapped) {
        if (y + LINE_MM[line.role] > contentBottom(doc, t)) {
          y = startPortraitPage(doc)
          doc.setFontSize(SIZE[line.role])
        }
        doc.text(piece, MARGIN_X + indent, y)
        y += LINE_MM[line.role]
      }
    }
    y += 4
  }
}
