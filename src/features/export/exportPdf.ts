import { format, parseISO, type Day } from 'date-fns'
import type { CustomMetric, CustomMetricEntry } from '@/domain/customMetric'
import {
  hadNightEating,
  totalWaterMl,
  type DailyEntry,
} from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import { weeklySummaries, type WeeklySummary } from '@/domain/stats'
import {
  formatNumber,
  formatSignedNumber,
  getDateFnsLocale,
  unitLabel,
  type Dictionary,
  type Locale,
} from '@/i18n'
import type { Unit } from '@/stores/unitStore'

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
    bodyMeasurements:
      data.latestWaistCm !== null ||
      data.latestHipCm !== null ||
      data.latestBodyFatPercent !== null,
    bodyComposition:
      data.latestMuscleMassKg !== null ||
      data.latestVisceralFatRating !== null ||
      data.latestBodyWaterPercent !== null ||
      data.latestBoneMassKg !== null,
    sleep: data.averageSleepHours !== null || data.averageDeepSleepHours !== null,
    steps: data.averageSteps !== null,
    water: data.averageWaterMl !== null,
    cycle: data.cycle.loggedDays > 0,
    digestion: data.digestion.loggedDays > 0,
    alcohol: data.alcohol.loggedDays > 0,
    nightEating: data.nightEating.loggedDays > 0,
  }
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
    if (!latest || entry.date > latest.date) latest = { value, date: entry.date }
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
    .filter((entry): entry is DailyEntry & { weightKg: number } =>
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
    latestMuscleMassKg: latestNumberField(entries, (entry) => entry.muscleMassKg),
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

function formatDisplayDate(iso: string, locale: Locale): string {
  return format(parseISO(iso), 'PP', { locale: getDateFnsLocale(locale) })
}

/**
 * Renders `data` (above) as a one-pager PDF (#609) for sharing outside the
 * app — e.g. with a clinician — entirely client-side, no upload. `jspdf`/
 * `jspdf-autotable` are dynamically imported (same reasoning as `exceljs`
 * in exportXlsx.ts: only pulled into a chunk when this function actually
 * runs, not on every Settings page load).
 *
 * The weight trend is drawn with plain jsPDF line/text primitives rather
 * than rasterizing the Dashboard's own Recharts SVG — that would need an
 * extra canvas-conversion dependency for what the issue itself calls
 * "image or simple chart"; a hand-drawn line is simple, deterministic, and
 * needs nothing beyond what's already being added for the table.
 */
export async function buildSummaryPdf(
  data: PdfSummaryData,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  sections: PdfSections = DEFAULT_PDF_SECTIONS,
  customMetricSummaries: CustomMetricPdfSummary[] = [],
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  // #623 — jsPDF's standard 14 fonts (the default here) have no Cyrillic
  // glyphs at all, so a Russian-locale document rendered as mojibake
  // without this. PT Sans covers Latin+Cyrillic in one font; see
  // ptSansRegularFont.ts's own doc comment for provenance/licensing.
  // Regular weight only — every `doc.text()` call below stays plain (no
  // bold/italic) rather than doubling the embedded font payload for a
  // second weight.
  const { PT_SANS_REGULAR_BASE64 } = await import('./ptSansRegularFont')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.addFileToVFS('PTSans-Regular.ttf', PT_SANS_REGULAR_BASE64)
  doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')
  doc.setFont('PTSans')
  const marginX = 15
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(18)
  doc.text(t.pdfSummary.documentTitle, marginX, 18)

  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(
    t.pdfSummary.rangeLabel(
      formatDisplayDate(data.rangeStart, locale),
      formatDisplayDate(data.rangeEnd, locale),
    ),
    marginX,
    25,
  )
  doc.setTextColor(0)

  let cursorY = 35

  if (sections.weightTrend) {
    doc.setFontSize(13)
    doc.text(t.pdfSummary.weightTrendSectionTitle, marginX, cursorY)
    cursorY += 6

    if (data.weightPoints.length === 0) {
      doc.setFontSize(10)
      doc.setTextColor(110)
      doc.text(t.pdfSummary.noWeightDataMessage, marginX, cursorY)
      doc.setTextColor(0)
      cursorY += 8
    } else {
      cursorY = drawWeightTrendChart(
        doc,
        data.weightPoints,
        unit,
        locale,
        marginX,
        cursorY,
        pageWidth - marginX * 2,
        50,
      )
    }
    cursorY += 4
  }

  if (sections.weeklyAverages) {
    doc.setFontSize(13)
    doc.text(t.pdfSummary.weeklyAveragesSectionTitle, marginX, cursorY)
    cursorY += 4

    if (data.weeks.length === 0) {
      doc.setFontSize(10)
      doc.setTextColor(110)
      doc.text(t.pdfSummary.noWeeklyDataMessage, marginX, cursorY + 4)
      doc.setTextColor(0)
      cursorY += 12
    } else {
      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [
          [
            t.pdfSummary.weekColumnHeader,
            t.pdfSummary.avgWeightColumnHeader(unitLabel(unit, t)),
            t.pdfSummary.weightChangeColumnHeader,
            t.pdfSummary.avgCaloriesColumnHeader,
          ],
        ],
        body: data.weeks.map((week) => [
          `${formatDisplayDate(week.weekStart, locale)} – ${formatDisplayDate(week.weekEnd, locale)}`,
          week.averageWeightKg === null
            ? '—'
            : formatNumber(toDisplayWeight(week.averageWeightKg, unit), locale),
          week.deltaVsPriorWeekKg === null
            ? '—'
            : formatSignedNumber(
                toDisplayWeight(week.deltaVsPriorWeekKg, unit),
                locale,
              ),
          week.averageCalories === null
            ? '—'
            : formatNumber(week.averageCalories, locale, 0),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [90, 90, 90] },
        styles: { fontSize: 9, font: 'PTSans', fontStyle: 'normal' },
      })
      cursorY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10
    }
  }

  if (sections.bodyMeasurements) {
    const lines: string[] = []
    if (data.latestWaistCm) {
      lines.push(
        t.pdfSummary.waistLabel(
          formatNumber(data.latestWaistCm.value, locale),
          formatDisplayDate(data.latestWaistCm.date, locale),
        ),
      )
    }
    if (data.latestHipCm) {
      lines.push(
        t.pdfSummary.hipLabel(
          formatNumber(data.latestHipCm.value, locale),
          formatDisplayDate(data.latestHipCm.date, locale),
        ),
      )
    }
    if (data.latestBodyFatPercent) {
      lines.push(
        t.pdfSummary.bodyFatLabel(
          formatNumber(data.latestBodyFatPercent.value, locale),
          formatDisplayDate(data.latestBodyFatPercent.date, locale),
        ),
      )
    }
    if (lines.length > 0) {
      cursorY = drawSimpleSection(
        doc,
        t.pdfSummary.bodyMeasurementsSectionTitle,
        lines,
        marginX,
        cursorY,
      )
    }
  }

  // #630 — bioimpedance-scale fields, same "most recent value" shape as
  // body measurements above, kept as a separate section (distinct source).
  if (sections.bodyComposition) {
    const lines: string[] = []
    if (data.latestMuscleMassKg) {
      lines.push(
        t.pdfSummary.muscleMassLabel(
          formatNumber(data.latestMuscleMassKg.value, locale),
          formatDisplayDate(data.latestMuscleMassKg.date, locale),
        ),
      )
    }
    if (data.latestVisceralFatRating) {
      lines.push(
        t.pdfSummary.visceralFatLabel(
          formatNumber(data.latestVisceralFatRating.value, locale),
          formatDisplayDate(data.latestVisceralFatRating.date, locale),
        ),
      )
    }
    if (data.latestBodyWaterPercent) {
      lines.push(
        t.pdfSummary.bodyWaterLabel(
          formatNumber(data.latestBodyWaterPercent.value, locale),
          formatDisplayDate(data.latestBodyWaterPercent.date, locale),
        ),
      )
    }
    if (data.latestBoneMassKg) {
      lines.push(
        t.pdfSummary.boneMassLabel(
          formatNumber(data.latestBoneMassKg.value, locale),
          formatDisplayDate(data.latestBoneMassKg.date, locale),
        ),
      )
    }
    if (lines.length > 0) {
      cursorY = drawSimpleSection(
        doc,
        t.pdfSummary.bodyCompositionSectionTitle,
        lines,
        marginX,
        cursorY,
      )
    }
  }

  // #630 — averaged over the whole range, not a "most recent" snapshot
  // (unlike the two sections above) since a single day's sleep/steps/water
  // reading is less informative than the trend over the period.
  if (sections.sleep) {
    const lines: string[] = []
    if (data.averageSleepHours) {
      lines.push(
        t.pdfSummary.averageValueLabel(
          t.dailyEntry.sleepHoursLabel,
          `${formatNumber(data.averageSleepHours.average, locale)} ${t.dailyEntry.hoursUnit}`,
          data.averageSleepHours.loggedDays,
        ),
      )
    }
    if (data.averageDeepSleepHours) {
      lines.push(
        t.pdfSummary.averageValueLabel(
          t.dailyEntry.deepSleepLabel,
          `${formatNumber(data.averageDeepSleepHours.average, locale)} ${t.dailyEntry.hoursUnit}`,
          data.averageDeepSleepHours.loggedDays,
        ),
      )
    }
    if (lines.length > 0) {
      cursorY = drawSimpleSection(
        doc,
        t.dailyEntry.sleepLabel,
        lines,
        marginX,
        cursorY,
      )
    }
  }

  if (sections.steps && data.averageSteps) {
    cursorY = drawSimpleSection(
      doc,
      t.dailyEntry.stepsLabel,
      [
        t.pdfSummary.averageValueOnlyLabel(
          formatNumber(data.averageSteps.average, locale, 0),
          data.averageSteps.loggedDays,
        ),
      ],
      marginX,
      cursorY,
    )
  }

  if (sections.water && data.averageWaterMl) {
    cursorY = drawSimpleSection(
      doc,
      t.dailyEntry.waterLabel,
      [
        t.pdfSummary.averageValueOnlyLabel(
          `${formatNumber(data.averageWaterMl.average, locale, 0)} ${t.dailyEntry.mlUnit}`,
          data.averageWaterMl.loggedDays,
        ),
      ],
      marginX,
      cursorY,
    )
  }

  // #630 — cycle/digestion/alcohol/night eating share one section: each is
  // the same "true/false over a range" shape, so bundling them keeps the
  // document from gaining four near-empty single-line sections in a row.
  const daySignalLines: string[] = []
  if (sections.cycle && data.cycle.loggedDays > 0) {
    daySignalLines.push(
      t.pdfSummary.daySignalLabel(
        t.dailyEntry.onPeriodLabel,
        data.cycle.trueDays,
        data.cycle.loggedDays,
      ),
    )
  }
  if (sections.digestion && data.digestion.loggedDays > 0) {
    daySignalLines.push(
      t.pdfSummary.daySignalLabel(
        t.dailyEntry.hadConstipationLabel,
        data.digestion.trueDays,
        data.digestion.loggedDays,
      ),
    )
  }
  if (sections.alcohol && data.alcohol.loggedDays > 0) {
    daySignalLines.push(
      t.pdfSummary.daySignalLabel(
        t.dailyEntry.hadAlcoholLabel,
        data.alcohol.trueDays,
        data.alcohol.loggedDays,
      ),
    )
  }
  if (sections.nightEating && data.nightEating.loggedDays > 0) {
    daySignalLines.push(
      t.pdfSummary.daySignalLabel(
        t.dailyEntry.nightEatingLabel(),
        data.nightEating.trueDays,
        data.nightEating.loggedDays,
      ),
    )
  }
  if (daySignalLines.length > 0) {
    cursorY = drawSimpleSection(
      doc,
      t.pdfSummary.daySignalsSectionTitle,
      daySignalLines,
      marginX,
      cursorY,
    )
  }

  // #630 — only the metrics the user actually selected that also have data
  // (`customMetricSummaries` only ever contains available ones, see
  // `buildCustomMetricPdfSummaries`).
  const selectedCustomMetrics = customMetricSummaries.filter((summary) =>
    sections.customMetricIds.includes(summary.metricId),
  )
  if (selectedCustomMetrics.length > 0) {
    drawSimpleSection(
      doc,
      t.pdfSummary.customMetricsSectionTitle,
      selectedCustomMetrics.map((summary) =>
        t.pdfSummary.averageValueLabel(
          summary.name,
          summary.unit
            ? `${formatNumber(summary.average, locale)} ${summary.unit}`
            : formatNumber(summary.average, locale),
          summary.loggedDays,
        ),
      ),
      marginX,
      cursorY,
    )
  }

  // #609 acceptance: the disclaimer must be visible on the document —
  // pinned near the bottom of every page it ends up on, not just wherever
  // the content happens to stop.
  const pageCount = doc.getNumberOfPages()
  const pageHeight = doc.internal.pageSize.getHeight()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(110)
    // #623 — no italic PT Sans is embedded (would double the font payload
    // for a purely cosmetic style); the muted color + small size already
    // read as a footnote without it.
    doc.setFont('PTSans')
    doc.text(t.pdfSummary.disclaimer, marginX, pageHeight - 12, {
      maxWidth: pageWidth - marginX * 2,
    })
    doc.text(
      t.pdfSummary.generatedOnLabel(formatDisplayDate(data.rangeEnd, locale)),
      marginX,
      pageHeight - 7,
    )
    doc.setTextColor(0)
  }

  return doc.output('blob')
}

function toDisplayWeight(kg: number, unit: Unit): number {
  return unit === 'lb' ? kgToLb(kg) : kg
}

/** #630 — shared renderer for every "title + a few text lines" section
 * (body composition, sleep, steps, water, day signals, custom metrics) —
 * only the weight trend (its own chart) and weekly averages (its own
 * table) need bespoke drawing. Returns the y coordinate just below the
 * drawn section, for the caller to continue laying out content from. */
function drawSimpleSection(
  doc: import('jspdf').jsPDF,
  title: string,
  lines: string[],
  marginX: number,
  cursorY: number,
): number {
  doc.setFontSize(13)
  doc.text(title, marginX, cursorY)
  cursorY += 6
  doc.setFontSize(10)
  for (const line of lines) {
    doc.text(line, marginX, cursorY)
    cursorY += 6
  }
  return cursorY + 2
}

/** Draws a plain axis + connected-line chart in the given box (mm) — see
 * `buildSummaryPdf`'s own doc comment for why this is hand-drawn rather
 * than an embedded chart image. Returns the y coordinate just below the
 * drawn chart, for the caller to continue laying out content from. */
function drawWeightTrendChart(
  doc: import('jspdf').jsPDF,
  points: { date: string; weightKg: number }[],
  unit: Unit,
  locale: Locale,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const values = points.map((p) => toDisplayWeight(p.weightKg, unit))
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  // A flat/single-point series would divide by zero below — pad the range
  // so the line still draws as a flat, centered line instead of crashing.
  const valueSpan = maxValue - minValue || 1

  const chartX = x + 20
  const chartWidth = width - 20
  const chartBottom = y + height

  doc.setDrawColor(180)
  doc.line(chartX, y, chartX, chartBottom)
  doc.line(chartX, chartBottom, chartX + chartWidth, chartBottom)

  doc.setFontSize(8)
  doc.setTextColor(110)
  doc.text(formatNumber(maxValue, locale, 0), x, y + 3)
  doc.text(formatNumber(minValue, locale, 0), x, chartBottom)
  doc.setTextColor(0)

  const toX = (index: number) =>
    points.length === 1
      ? chartX + chartWidth / 2
      : chartX + (index / (points.length - 1)) * chartWidth
  const toY = (value: number) =>
    chartBottom - ((value - minValue) / valueSpan) * height

  doc.setDrawColor(40, 100, 200)
  doc.setLineWidth(0.5)
  for (let i = 1; i < points.length; i++) {
    doc.line(
      toX(i - 1),
      toY(values[i - 1]),
      toX(i),
      toY(values[i]),
    )
  }
  doc.setLineWidth(0.2)
  doc.setDrawColor(0)

  doc.setFontSize(8)
  doc.setTextColor(110)
  doc.text(formatDisplayDate(points[0].date, locale), chartX, chartBottom + 5)
  const lastLabel = formatDisplayDate(points[points.length - 1].date, locale)
  doc.text(
    lastLabel,
    chartX + chartWidth - doc.getTextWidth(lastLabel),
    chartBottom + 5,
  )
  doc.setTextColor(0)

  return chartBottom + 8
}
