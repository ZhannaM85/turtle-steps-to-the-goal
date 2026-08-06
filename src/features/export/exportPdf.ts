import { format, parseISO, type Day } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
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

export interface PdfSummaryData {
  rangeStart: string
  rangeEnd: string
  weightPoints: { date: string; weightKg: number }[]
  weeks: WeeklySummary[]
  latestWaistCm: { value: number; date: string } | null
  latestHipCm: { value: number; date: string } | null
  latestBodyFatPercent: { value: number; date: string } | null
}

/** #629 — which optional sections to render; the disclaimer footer isn't
 * included here since it's unconditional per #609's own acceptance
 * criteria. Defaults to all-on so existing callers/tests are unaffected. */
export interface PdfSections {
  weightTrend: boolean
  weeklyAverages: boolean
  bodyMeasurements: boolean
}

const DEFAULT_PDF_SECTIONS: PdfSections = {
  weightTrend: true,
  weeklyAverages: true,
  bodyMeasurements: true,
}

function latestNumberField(
  entries: DailyEntry[],
  pick: (entry: DailyEntry) => number | undefined,
): { value: number; date: string } | null {
  let latest: { value: number; date: string } | null = null
  for (const entry of entries) {
    const value = pick(entry)
    if (value === undefined) continue
    if (!latest || entry.date > latest.date) latest = { value, date: entry.date }
  }
  return latest
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

  const hasBodyMeasurements =
    sections.bodyMeasurements &&
    (data.latestWaistCm !== null ||
      data.latestHipCm !== null ||
      data.latestBodyFatPercent !== null)
  if (hasBodyMeasurements) {
    doc.setFontSize(13)
    doc.text(t.pdfSummary.bodyMeasurementsSectionTitle, marginX, cursorY)
    cursorY += 6
    doc.setFontSize(10)
    if (data.latestWaistCm) {
      doc.text(
        t.pdfSummary.waistLabel(
          formatNumber(data.latestWaistCm.value, locale),
          formatDisplayDate(data.latestWaistCm.date, locale),
        ),
        marginX,
        cursorY,
      )
      cursorY += 6
    }
    if (data.latestHipCm) {
      doc.text(
        t.pdfSummary.hipLabel(
          formatNumber(data.latestHipCm.value, locale),
          formatDisplayDate(data.latestHipCm.date, locale),
        ),
        marginX,
        cursorY,
      )
      cursorY += 6
    }
    if (data.latestBodyFatPercent) {
      doc.text(
        t.pdfSummary.bodyFatLabel(
          formatNumber(data.latestBodyFatPercent.value, locale),
          formatDisplayDate(data.latestBodyFatPercent.date, locale),
        ),
        marginX,
        cursorY,
      )
    }
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
