import { type Day } from 'date-fns'
import type { CustomMetric, CustomMetricEntry } from '@/domain/customMetric'
import {
  hadNightEating,
  totalWaterMl,
  type DailyEntry,
} from '@/domain/dailyEntry'
import { weeklySummaries, type WeeklySummary } from '@/domain/stats'
import { type Dictionary, type Locale } from '@/i18n'
import type { Unit } from '@/stores/unitStore'
import { buildPdfDocumentHtml } from './buildPdfDocumentHtml'
import type { DailyLogPdfInput } from './exportPdfDailyLog'
import { renderHtmlDocumentToPdfBlob } from './renderHtmlDocumentToPdfBlob'

interface LatestField {
  value: number
  date: string
}

/** A field averaged over the whole range — `loggedDays` is how many days in
 * the range actually had a value, since that's shown alongside the average
 * (#630) and also doubles as this field's own "is there any data" check. */
interface AverageField {
  average: number
  loggedDays: number
}

/** A day-level yes/no field (cycle/digestion/alcohol/night eating, #630) —
 * `loggedDays` counts days with an explicit value either way (not just
 * `true`), so a field with a real but all-`false` history still reports
 * "0 of 12 days" instead of reading as unavailable. */
interface BooleanFieldSummary {
  loggedDays: number
  trueDays: number
}

export interface PdfSummaryData {
  rangeStart: string
  rangeEnd: string
  weightPoints: { date: string; weightKg: number }[]
  weeks: WeeklySummary[]
  latestWaistCm: LatestField | null
  latestHipCm: LatestField | null
  latestBodyFatPercent: LatestField | null
  latestMuscleMassKg: LatestField | null
  latestVisceralFatRating: LatestField | null
  latestBodyWaterPercent: LatestField | null
  latestBoneMassKg: LatestField | null
  averageSleepHours: AverageField | null
  averageDeepSleepHours: AverageField | null
  averageSteps: AverageField | null
  averageWaterMl: AverageField | null
  cycle: BooleanFieldSummary
  digestion: BooleanFieldSummary
  alcohol: BooleanFieldSummary
  nightEating: BooleanFieldSummary
}

/** #630 — one entry per selected custom metric with at least one logged
 * value in range; a metric with none is simply absent from this list
 * (callers use that absence as the "no data" / disabled signal). */
export interface CustomMetricPdfSummary {
  metricId: string
  name: string
  unit?: string
  average: number
  loggedDays: number
}

/** #629 — which optional sections to render; the disclaimer footer isn't
 * included here since it's unconditional per #609's own acceptance
 * criteria. Defaults to all-on so existing callers/tests are unaffected.
 * #630 expanded this from the original 3 fields to every tracked metric,
 * plus a dynamic list of selected custom metric ids (there's no fixed
 * count of those, unlike the built-in fields). */
export interface PdfSections {
  weightTrend: boolean
  weeklyAverages: boolean
  bodyMeasurements: boolean
  bodyComposition: boolean
  sleep: boolean
  steps: boolean
  water: boolean
  cycle: boolean
  digestion: boolean
  alcohol: boolean
  nightEating: boolean
  customMetricIds: string[]
}

const DEFAULT_PDF_SECTIONS: PdfSections = {
  weightTrend: true,
  weeklyAverages: true,
  bodyMeasurements: true,
  bodyComposition: true,
  sleep: true,
  steps: true,
  water: true,
  cycle: true,
  digestion: true,
  alcohol: true,
  nightEating: true,
  customMetricIds: [],
}

/** #630 — whether each built-in section has any data in the currently-built
 * `PdfSummaryData`, i.e. whether its toggle should be selectable in
 * `PdfSectionsDialog`. Custom metrics aren't included here since they're a
 * dynamic list — see `customMetricPdfOptions` below instead. */
export interface PdfSectionAvailability {
  weightTrend: boolean
  weeklyAverages: boolean
  bodyMeasurements: boolean
  bodyComposition: boolean
  sleep: boolean
  steps: boolean
  water: boolean
  cycle: boolean
  digestion: boolean
  alcohol: boolean
  nightEating: boolean
}

/** Every section unavailable — the state before `ExportSection.tsx` has
 * finished computing a real `PdfSummaryData` for the picked range. */
export const EMPTY_PDF_SECTION_AVAILABILITY: PdfSectionAvailability = {
  weightTrend: false,
  weeklyAverages: false,
  bodyMeasurements: false,
  bodyComposition: false,
  sleep: false,
  steps: false,
  water: false,
  cycle: false,
  digestion: false,
  alcohol: false,
  nightEating: false,
}

export function pdfSectionAvailability(
  data: PdfSummaryData,
): PdfSectionAvailability {
  return {
    weightTrend: data.weightPoints.length > 0,
    weeklyAverages: data.weeks.length > 0,
    bodyMeasurements: data.latestWaistCm !== null || data.latestHipCm !== null,
    bodyComposition:
      data.latestBodyFatPercent !== null ||
      data.latestMuscleMassKg !== null ||
      data.latestVisceralFatRating !== null ||
      data.latestBodyWaterPercent !== null ||
      data.latestBoneMassKg !== null,
    sleep:
      data.averageSleepHours !== null || data.averageDeepSleepHours !== null,
    steps: data.averageSteps !== null,
    water: data.averageWaterMl !== null,
    cycle: data.cycle.loggedDays > 0,
    digestion: data.digestion.loggedDays > 0,
    alcohol: data.alcohol.loggedDays > 0,
    nightEating: data.nightEating.loggedDays > 0,
  }
}

/** #633 — whether each gated section is *currently* tracked in Settings'
 * "What to track" (`useTrackedFieldsStore`) plus the older per-field opt-in
 * stores (`useCycleTrackingStore` etc., #237's doc comment explains why
 * those stay separate) it was folded together with. `weightTrend`/
 * `weeklyAverages` have no such toggle — weight itself is always tracked —
 * so there's nothing to gate them on. */
export interface PdfSectionTrackingGate {
  sleep: boolean
  steps: boolean
  bodyMeasurements: boolean
  bodyComposition: boolean
  nightEating: boolean
  cycle: boolean
  digestion: boolean
  alcohol: boolean
  water: boolean
}

/**
 * #633 — a section can have real historical data (`pdfSectionAvailability`
 * above) from before its Settings toggle was turned off, or from a signal
 * that was never an intentional opt-in in the first place — that's still
 * "available" by the pure has-data check, but offering it in the picker
 * reads as wrong when Settings currently says it isn't tracked. ANDs the
 * two checks together per section rather than changing what "has data"
 * means on its own (`pdfSectionAvailability`'s existing tests, e.g. an
 * all-false boolean field still counting as available, stay valid either
 * way — this only ever narrows the result further).
 */
export function gatePdfSectionAvailability(
  availability: PdfSectionAvailability,
  tracking: PdfSectionTrackingGate,
): PdfSectionAvailability {
  return {
    weightTrend: availability.weightTrend,
    weeklyAverages: availability.weeklyAverages,
    bodyMeasurements:
      availability.bodyMeasurements && tracking.bodyMeasurements,
    bodyComposition: availability.bodyComposition && tracking.bodyComposition,
    sleep: availability.sleep && tracking.sleep,
    steps: availability.steps && tracking.steps,
    water: availability.water && tracking.water,
    cycle: availability.cycle && tracking.cycle,
    digestion: availability.digestion && tracking.digestion,
    alcohol: availability.alcohol && tracking.alcohol,
    nightEating: availability.nightEating && tracking.nightEating,
  }
}

/** #634 — a disabled toggle in `PdfSectionsDialog` can be disabled for one
 * of two independent reasons, and the user can't tell which from the
 * toggle alone: its Settings "What to track" gate is off (see
 * `gatePdfSectionAvailability` above), or it's on but there's simply no
 * data for it in the picked range. */
export type PdfSectionDisabledReason = 'notTrackedInSettings' | 'noDataInRange'

/**
 * #634 — which of the two reasons applies for a given section, given the
 * pure has-data check (`rawAvailability`, i.e. `pdfSectionAvailability`'s
 * own output before gating) and the Settings tracking gate. `key in
 * tracking` doubles as "does this section even have a tracking toggle" —
 * `weightTrend`/`weeklyAverages` aren't in `PdfSectionTrackingGate` at all
 * (see its own doc comment), so they can only ever be disabled for lack of
 * data. Returns `null` when the section isn't disabled at all.
 */
export function pdfSectionDisabledReason(
  key: keyof PdfSectionAvailability,
  rawAvailability: PdfSectionAvailability,
  tracking: PdfSectionTrackingGate,
): PdfSectionDisabledReason | null {
  if (key in tracking && !tracking[key as keyof PdfSectionTrackingGate]) {
    return 'notTrackedInSettings'
  }
  if (!rawAvailability[key]) {
    return 'noDataInRange'
  }
  return null
}

export interface CustomMetricPdfOption {
  id: string
  name: string
  available: boolean
}

/** #630 — every defined custom metric, each flagged with whether it has
 * data in the currently-picked range (`summaries` — see
 * `buildCustomMetricPdfSummaries` below) so `PdfSectionsDialog` can list
 * every metric but only enable the ones with something to show. */
export function customMetricPdfOptions(
  metrics: CustomMetric[],
  summaries: CustomMetricPdfSummary[],
): CustomMetricPdfOption[] {
  const availableIds = new Set(summaries.map((s) => s.metricId))
  return metrics.map((metric) => ({
    id: metric.id,
    name: metric.name,
    available: availableIds.has(metric.id),
  }))
}

function latestNumberField(
  entries: DailyEntry[],
  pick: (entry: DailyEntry) => number | undefined,
): LatestField | null {
  let latest: LatestField | null = null
  for (const entry of entries) {
    const value = pick(entry)
    if (value === undefined) continue
    if (!latest || entry.date > latest.date)
      latest = { value, date: entry.date }
  }
  return latest
}

function averageNumberField(
  entries: DailyEntry[],
  pick: (entry: DailyEntry) => number | undefined,
): AverageField | null {
  const values = entries
    .map(pick)
    .filter((value): value is number => value !== undefined)
  if (values.length === 0) return null
  return {
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    loggedDays: values.length,
  }
}

function booleanFieldSummary(
  entries: DailyEntry[],
  pick: (entry: DailyEntry) => boolean | undefined,
): BooleanFieldSummary {
  let loggedDays = 0
  let trueDays = 0
  for (const entry of entries) {
    const value = pick(entry)
    if (value === undefined) continue
    loggedDays++
    if (value) trueDays++
  }
  return { loggedDays, trueDays }
}

/** #630 — same pure data-shaping as `buildPdfSummaryData` below, just for
 * custom metrics (a separate domain from `DailyEntry`, so it needs its own
 * inputs rather than folding into that function's signature). Only
 * `metrics` with at least one entry in range appear in the result. */
export function buildCustomMetricPdfSummaries(
  metrics: CustomMetric[],
  entries: CustomMetricEntry[],
  rangeStart: string,
  rangeEnd: string,
): CustomMetricPdfSummary[] {
  const summaries: CustomMetricPdfSummary[] = []
  for (const metric of metrics) {
    const values = entries
      .filter(
        (entry) =>
          entry.metricId === metric.id &&
          entry.date >= rangeStart &&
          entry.date <= rangeEnd,
      )
      .map((entry) => entry.value)
    if (values.length === 0) continue
    summaries.push({
      metricId: metric.id,
      name: metric.name,
      unit: metric.unit,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      loggedDays: values.length,
    })
  }
  return summaries
}

/**
 * Pure data shaping for #609's PDF (below). `rangeStart`/`rangeEnd` are
 * plain ISO date strings the caller resolves (#624 — a free-form date
 * range picker, same shape `ExportSection.tsx`'s other exports already
 * use, rather than this function owning a fixed "last N days" concept)
 * — both inclusive, both required, so this stays deterministic to test
 * rather than depending on a live clock.
 */
export function buildPdfSummaryData(
  allEntries: DailyEntry[],
  rangeStart: string,
  rangeEnd: string,
  weekStartsOn: Day,
): PdfSummaryData {
  const entries = allEntries.filter(
    (entry) => entry.date >= rangeStart && entry.date <= rangeEnd,
  )

  const weightPoints = entries
    .filter(
      (entry): entry is DailyEntry & { weightKg: number } =>
        entry.weightKg !== undefined,
    )
    .map((entry) => ({ date: entry.date, weightKg: entry.weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    rangeStart,
    rangeEnd,
    weightPoints,
    weeks: weeklySummaries(entries, undefined, weekStartsOn),
    latestWaistCm: latestNumberField(entries, (entry) => entry.waistCm),
    latestHipCm: latestNumberField(entries, (entry) => entry.hipCm),
    latestBodyFatPercent: latestNumberField(
      entries,
      (entry) => entry.bodyFatPercent,
    ),
    latestMuscleMassKg: latestNumberField(
      entries,
      (entry) => entry.muscleMassKg,
    ),
    latestVisceralFatRating: latestNumberField(
      entries,
      (entry) => entry.visceralFatRating,
    ),
    latestBodyWaterPercent: latestNumberField(
      entries,
      (entry) => entry.bodyWaterPercent,
    ),
    latestBoneMassKg: latestNumberField(entries, (entry) => entry.boneMassKg),
    averageSleepHours: averageNumberField(entries, (entry) => entry.sleepHours),
    averageDeepSleepHours: averageNumberField(
      entries,
      (entry) => entry.deepSleepHours,
    ),
    averageSteps: averageNumberField(entries, (entry) => entry.steps),
    averageWaterMl: averageNumberField(entries, (entry) =>
      totalWaterMl(entry.waterEntries),
    ),
    cycle: booleanFieldSummary(entries, (entry) => entry.onPeriod),
    digestion: booleanFieldSummary(entries, (entry) => entry.hadConstipation),
    alcohol: booleanFieldSummary(entries, (entry) => entry.hadAlcohol),
    nightEating: booleanFieldSummary(entries, (entry) => hadNightEating(entry)),
  }
}

/**
 * #609 / #905 — render the summary (and optional daily-log pages) as
 * HTML+CSS, then convert client-side via html2canvas + jsPDF (per page).
 * Data shaping stays
 * in buildPdfSummaryData above; layout lives in buildPdfDocumentHtml.
 */
export async function buildSummaryPdf(
  data: PdfSummaryData,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  sections: PdfSections = DEFAULT_PDF_SECTIONS,
  customMetricSummaries: CustomMetricPdfSummary[] = [],
  dailyLog?: DailyLogPdfInput,
): Promise<Blob> {
  const html = buildPdfDocumentHtml(
    data,
    t,
    locale,
    unit,
    sections,
    customMetricSummaries,
    dailyLog,
  )
  return renderHtmlDocumentToPdfBlob(html)
}
