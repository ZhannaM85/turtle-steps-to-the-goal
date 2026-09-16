import { format, parseISO } from 'date-fns'
import { kgToLb } from '@/domain/goal'
import {
  formatNumber,
  formatSignedNumber,
  getDateFnsLocale,
  unitLabel,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { formatSleepDuration } from '@/shared/lib/sleepDuration'
import type { Unit } from '@/stores/unitStore'
import {
  dailyLogPdfDayLines,
  type DailyLogPdfInput,
} from './exportPdfDailyLog'
import type {
  CustomMetricPdfSummary,
  PdfSections,
  PdfSummaryData,
} from './exportPdf'
import { PDF_DOCUMENT_CSS } from './pdfDocumentStyles'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDisplayDate(iso: string, locale: Locale): string {
  return format(parseISO(iso), 'PP', { locale: getDateFnsLocale(locale) })
}

function toDisplayWeight(kg: number, unit: Unit): number {
  return unit === 'lb' ? kgToLb(kg) : kg
}

function sectionHtml(title: string, body: string): string {
  if (!body.trim()) return ''
  return `<section class="pdf-section"><h2 class="pdf-section-title">${escapeHtml(title)}</h2>${body}</section>`
}

function linesHtml(lines: string[]): string {
  return lines
    .map((line) => `<p class="pdf-line">${escapeHtml(line)}</p>`)
    .join('')
}

function weightTrendSvg(
  points: { date: string; weightKg: number }[],
  unit: Unit,
  locale: Locale,
): string {
  if (points.length === 0) return ''
  const values = points.map((p) => toDisplayWeight(p.weightKg, unit))
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueSpan = maxValue - minValue || 1
  const width = 520
  const height = 140
  const padL = 36
  const padR = 8
  const padT = 10
  const padB = 24
  const chartW = width - padL - padR
  const chartH = height - padT - padB
  const toX = (index: number) =>
    points.length === 1
      ? padL + chartW / 2
      : padL + (index / (points.length - 1)) * chartW
  const toY = (value: number) =>
    padT + chartH - ((value - minValue) / valueSpan) * chartH
  const path = values
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${toX(index).toFixed(1)},${toY(value).toFixed(1)}`)
    .join(' ')
  const firstLabel = escapeHtml(formatDisplayDate(points[0]!.date, locale))
  const lastLabel = escapeHtml(
    formatDisplayDate(points[points.length - 1]!.date, locale),
  )
  return `<svg class="pdf-chart" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
  <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#c4c0bb" />
  <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="#c4c0bb" />
  <path d="${path}" fill="none" stroke="#2864c8" stroke-width="2" />
  <text x="4" y="${padT + 8}" font-size="10" fill="#78716c">${escapeHtml(formatNumber(maxValue, locale, 0))}</text>
  <text x="4" y="${padT + chartH}" font-size="10" fill="#78716c">${escapeHtml(formatNumber(minValue, locale, 0))}</text>
  <text x="${padL}" y="${height - 6}" font-size="10" fill="#78716c">${firstLabel}</text>
  <text x="${padL + chartW}" y="${height - 6}" font-size="10" fill="#78716c" text-anchor="end">${lastLabel}</text>
</svg>`
}

function footerHtml(t: Dictionary, generatedOn: string): string {
  return `<footer class="pdf-footer">
  <p>${escapeHtml(t.pdfSummary.disclaimer)}</p>
  <p>${escapeHtml(generatedOn)}</p>
</footer>`
}

function dailyLogPagesHtml(
  dailyLog: DailyLogPdfInput,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  generatedOn: string,
): string {
  const entries = [...dailyLog.entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  if (entries.length === 0) return ''

  // #920 — each new date starts a fresh sheet. Within a day the renderer
  // can still move complete section cards to continuation sheets; keeping
  // the heading with its first card avoids an orphaned date at the bottom.
  return entries
    .map((entry, index) => {
      const lines = dailyLogPdfDayLines(
        entry,
        t,
        locale,
        unit,
        dailyLog.extras,
      )
      let header = ''
      let sectionTitle = ''
      let sectionContent: string[] = []
      const sections: string[] = []
      const finishSection = () => {
        if (!sectionTitle) return
        const sectionClass =
          sectionTitle === t.dailyEntry.waterLabel
            ? ' pdf-day-section-water'
            : ''
        sections.push(`<section class="pdf-day-section${sectionClass}">
  <h3 class="pdf-day-section-title">${escapeHtml(sectionTitle)}</h3>
  <div class="pdf-day-section-content">${sectionContent.join('')}</div>
</section>`)
        sectionTitle = ''
        sectionContent = []
      }
      for (const line of lines) {
        if (line.role === 'header') {
          header = `<h2 class="pdf-day-header">${escapeHtml(line.text)}</h2>`
          continue
        }
        if (line.role === 'section') {
          finishSection()
          sectionTitle = line.text
          continue
        }
        const lineHtml =
          line.role === 'item'
            ? `<p class="pdf-day-item">${escapeHtml(line.text)}</p>`
            : `<p class="pdf-line">${escapeHtml(line.text)}</p>`
        sectionContent.push(lineHtml)
      }
      finishSection()
      // Keep the diary title and first date together, but leave each card
      // as a direct page-body child. The HTML renderer can then move a card
      // to the next styled sheet instead of image-slicing a whole day and
      // creating an almost-empty tail page.
      const dayStart =
        index === 0
          ? `<h1 class="pdf-title">${escapeHtml(t.pdfSummary.dailyLogPagesTitle)}</h1>${header}`
          : header
      const firstSection = sections.shift() ?? ''
      return `<section class="pdf-page">
  <div class="pdf-page-body"><div class="pdf-day-start">${dayStart}${firstSection}</div>${sections.join('')}</div>
  ${footerHtml(t, generatedOn)}
</section>`
    })
    .join('\n')
}

/**
 * #905 — HTML+CSS document for the PDF pipeline (summary + optional day
 * pages). Pure string builder so unit tests can assert content without
 * canvas/PDF rendering.
 */
export function buildPdfDocumentHtml(
  data: PdfSummaryData,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  sections: PdfSections,
  customMetricSummaries: CustomMetricPdfSummary[] = [],
  dailyLog?: DailyLogPdfInput,
  generatedOnOverride?: string,
): string {
  const generatedOn =
    generatedOnOverride ??
    t.pdfSummary.generatedOnLabel(formatDisplayDate(data.rangeEnd, locale))
  const parts: string[] = []

  if (sections.weightTrend) {
    parts.push(
      sectionHtml(
        t.pdfSummary.weightTrendSectionTitle,
        data.weightPoints.length === 0
          ? `<p class="pdf-muted">${escapeHtml(t.pdfSummary.noWeightDataMessage)}</p>`
          : weightTrendSvg(data.weightPoints, unit, locale),
      ),
    )
  }

  if (sections.weeklyAverages) {
    if (data.weeks.length === 0) {
      parts.push(
        sectionHtml(
          t.pdfSummary.weeklyAveragesSectionTitle,
          `<p class="pdf-muted">${escapeHtml(t.pdfSummary.noWeeklyDataMessage)}</p>`,
        ),
      )
    } else {
      const rows = data.weeks
        .map((week) => {
          const avgWeight =
            week.averageWeightKg === null
              ? '—'
              : formatNumber(toDisplayWeight(week.averageWeightKg, unit), locale)
          const delta =
            week.deltaVsPriorWeekKg === null
              ? '—'
              : formatSignedNumber(
                  toDisplayWeight(week.deltaVsPriorWeekKg, unit),
                  locale,
                )
          const avgCal =
            week.averageCalories === null
              ? '—'
              : formatNumber(week.averageCalories, locale, 0)
          return `<tr>
  <td>${escapeHtml(`${formatDisplayDate(week.weekStart, locale)} – ${formatDisplayDate(week.weekEnd, locale)}`)}</td>
  <td>${escapeHtml(avgWeight)}</td>
  <td>${escapeHtml(delta)}</td>
  <td>${escapeHtml(avgCal)}</td>
</tr>`
        })
        .join('')
      parts.push(
        sectionHtml(
          t.pdfSummary.weeklyAveragesSectionTitle,
          `<table class="pdf-table"><thead><tr>
  <th>${escapeHtml(t.pdfSummary.weekColumnHeader)}</th>
  <th>${escapeHtml(t.pdfSummary.avgWeightColumnHeader(unitLabel(unit, t)))}</th>
  <th>${escapeHtml(t.pdfSummary.weightChangeColumnHeader)}</th>
  <th>${escapeHtml(t.pdfSummary.avgCaloriesColumnHeader)}</th>
</tr></thead><tbody>${rows}</tbody></table>`,
        ),
      )
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
    if (lines.length > 0) {
      parts.push(
        sectionHtml(
          t.pdfSummary.bodyMeasurementsSectionTitle,
          linesHtml(lines),
        ),
      )
    }
  }

  if (sections.bodyComposition) {
    const lines: string[] = []
    if (data.latestBodyFatPercent) {
      lines.push(
        t.pdfSummary.bodyFatLabel(
          formatNumber(data.latestBodyFatPercent.value, locale),
          formatDisplayDate(data.latestBodyFatPercent.date, locale),
        ),
      )
    }
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
      parts.push(
        sectionHtml(
          t.pdfSummary.bodyCompositionSectionTitle,
          linesHtml(lines),
        ),
      )
    }
  }

  if (sections.sleep) {
    const lines: string[] = []
    if (data.averageSleepHours) {
      lines.push(
        t.pdfSummary.averageValueLabel(
          t.dailyEntry.sleepHoursLabel,
          formatSleepDuration(
            data.averageSleepHours.average,
            t.dailyEntry.hoursUnit,
            t.dailyEntry.minutesUnit,
          ),
          data.averageSleepHours.loggedDays,
        ),
      )
    }
    if (data.averageDeepSleepHours) {
      lines.push(
        t.pdfSummary.averageValueLabel(
          t.dailyEntry.deepSleepLabel,
          formatSleepDuration(
            data.averageDeepSleepHours.average,
            t.dailyEntry.hoursUnit,
            t.dailyEntry.minutesUnit,
          ),
          data.averageDeepSleepHours.loggedDays,
        ),
      )
    }
    if (lines.length > 0) {
      parts.push(sectionHtml(t.dailyEntry.sleepLabel, linesHtml(lines)))
    }
  }

  if (sections.steps && data.averageSteps) {
    parts.push(
      sectionHtml(
        t.dailyEntry.stepsLabel,
        linesHtml([
          t.pdfSummary.averageValueOnlyLabel(
            formatNumber(data.averageSteps.average, locale, 0),
            data.averageSteps.loggedDays,
          ),
        ]),
      ),
    )
  }

  if (sections.water && data.averageWaterMl) {
    parts.push(
      sectionHtml(
        t.dailyEntry.waterLabel,
        linesHtml([
          t.pdfSummary.averageValueOnlyLabel(
            `${formatNumber(data.averageWaterMl.average, locale, 0)} ${t.dailyEntry.mlUnit}`,
            data.averageWaterMl.loggedDays,
          ),
        ]),
      ),
    )
  }

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
    parts.push(
      sectionHtml(t.pdfSummary.daySignalsSectionTitle, linesHtml(daySignalLines)),
    )
  }

  const selectedCustomMetrics = customMetricSummaries.filter((summary) =>
    sections.customMetricIds.includes(summary.metricId),
  )
  if (selectedCustomMetrics.length > 0) {
    parts.push(
      sectionHtml(
        t.pdfSummary.customMetricsSectionTitle,
        linesHtml(
          selectedCustomMetrics.map((summary) =>
            t.pdfSummary.averageValueLabel(
              summary.name,
              summary.unit
                ? `${formatNumber(summary.average, locale)} ${summary.unit}`
                : formatNumber(summary.average, locale),
              summary.loggedDays,
            ),
          ),
        ),
      ),
    )
  }

  const summaryPage = `<section class="pdf-page">
  <div class="pdf-page-body">
    <h1 class="pdf-title">${escapeHtml(t.pdfSummary.documentTitle)}</h1>
    <p class="pdf-range">${escapeHtml(
      t.pdfSummary.rangeLabel(
        formatDisplayDate(data.rangeStart, locale),
        formatDisplayDate(data.rangeEnd, locale),
      ),
    )}</p>
    ${parts.join('\n')}
  </div>
  ${footerHtml(t, generatedOn)}
</section>`

  const dailyPages =
    dailyLog && dailyLog.entries.length > 0
      ? dailyLogPagesHtml(dailyLog, t, locale, unit, generatedOn)
      : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${PDF_DOCUMENT_CSS}</style></head><body><div class="pdf-root">${summaryPage}${dailyPages}</div></body></html>`
}

/** #894 / #905 — HTML for a single day share PDF (no summary page). */
export function buildSingleDayPdfDocumentHtml(
  dailyLog: DailyLogPdfInput,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  generatedOn: string,
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${PDF_DOCUMENT_CSS}</style></head><body><div class="pdf-root">${dailyLogPagesHtml(dailyLog, t, locale, unit, generatedOn)}</div></body></html>`
}
