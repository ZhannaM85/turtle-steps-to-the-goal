import type { Dictionary, Locale } from '@/i18n'
import type { Unit } from '@/stores/unitStore'
import { dailyLogPdfDayLines, type DailyLogPdfInput } from './exportPdfDailyLog'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const diaryHeaderMetricKinds = {
  sleep: true,
  deepSleep: true,
  steps: true,
} as const

function diaryMetricLineHtml(text: string): string {
  const separator = text.indexOf(':')
  if (separator < 0) return escapeHtml(text)
  return `<strong class="pdf-day-line-label">${escapeHtml(text.slice(0, separator + 1))}</strong>${escapeHtml(text.slice(separator + 1))}`
}

/** One dated diary page; the PDF renderer may move whole section cards to a continuation sheet. */
export function dailyLogPagesHtml(
  dailyLog: DailyLogPdfInput,
  t: Dictionary,
  locale: Locale,
  unit: Unit,
  footer: string,
): string {
  const entries = [...dailyLog.entries].sort((a, b) => a.date.localeCompare(b.date))
  return entries.map((entry, index) => {
    const lines = dailyLogPdfDayLines(entry, t, locale, unit, dailyLog.extras)
    let header = ''
    const metricsHeaderValues: string[] = []
    let sectionTitle = ''
    let sectionContent: string[] = []
    let mealOpen = false
    let mealIndex = 0
    let mealColumns: [string[], string[]] = [[], []]
    let activeMealColumn: string[] | null = null
    const sections: string[] = []
    const finishSection = () => {
      if (!sectionTitle) return
      if (mealOpen && activeMealColumn) {
        activeMealColumn.push('</div>')
        mealOpen = false
      }
      const sectionClass = sectionTitle === t.pdfSummary.dailyLogMetricsSectionTitle
        ? ' pdf-day-section-metrics'
        : sectionTitle.startsWith(t.pdfSummary.dailyLogFoodSectionTitle)
          ? ' pdf-day-section-food'
          : sectionTitle === t.dailyEntry.waterLabel ||
              sectionTitle.startsWith(`${t.dailyEntry.waterLabel}  ·  `)
            ? ' pdf-day-section-water'
            : sectionTitle === t.pdfSummary.dailyLogNotesSectionTitle
              ? ' pdf-day-section-notes'
              : ''
      const waterTitleParts = sectionTitle.split('  ·  ')
      const titleHtml = sectionTitle === t.pdfSummary.dailyLogMetricsSectionTitle
        ? `<span>${escapeHtml([sectionTitle, ...metricsHeaderValues].join(' · '))}</span>`
        : sectionClass.includes('pdf-day-section-water') && waterTitleParts.length > 1
          ? `<span class="pdf-day-section-title-lead"><span>${escapeHtml(waterTitleParts[0] ?? '')}</span> <span class="pdf-day-section-water-total">${escapeHtml(waterTitleParts.slice(1).join('  ·  '))}</span></span>`
          : `<span>${escapeHtml(sectionTitle)}</span>`
      const mealColumnsHtml = mealColumns.some((column) => column.length > 0)
        ? `<div class="pdf-meal-columns"><div class="pdf-meal-column pdf-meal-column-left">${mealColumns[0].join('')}</div><div class="pdf-meal-column pdf-meal-column-right">${mealColumns[1].join('')}</div></div>`
        : ''
      sections.push(`<section class="pdf-day-section${sectionClass}">
  <h3 class="pdf-day-section-title">${titleHtml}</h3>
  <div class="pdf-day-section-content">${mealColumnsHtml}${sectionContent.join('')}</div>
</section>`)
      sectionTitle = ''
      sectionContent = []
      mealColumns = [[], []]
      activeMealColumn = null
    }
    for (const line of lines) {
      if (line.role === 'header') {
        header = `<div class="pdf-day-header"><h2>${escapeHtml(line.text)}</h2>`
        continue
      }
      if (line.kind && line.kind in diaryHeaderMetricKinds) {
        metricsHeaderValues.push(line.text)
        continue
      }
      if (line.role === 'section') {
        finishSection()
        sectionTitle = line.text
        continue
      }
      const lineText = sectionTitle === t.pdfSummary.dailyLogMetricsSectionTitle
        ? diaryMetricLineHtml(line.text)
        : escapeHtml(line.text)
      const lineHtml = line.role === 'item'
        ? `<p class="pdf-day-item">${escapeHtml(line.text)}</p>`
        : `<p class="pdf-line">${lineText}</p>`
      if (line.kind === 'meal') {
        if (mealOpen && activeMealColumn) activeMealColumn.push('</div>')
        activeMealColumn = mealColumns[mealIndex % 2] ?? mealColumns[0]
        activeMealColumn.push(`<div class="pdf-meal-card">${lineHtml}`)
        mealIndex += 1
        mealOpen = true
      } else {
        if (line.kind === 'dayTotal' && mealOpen && activeMealColumn) {
          activeMealColumn.push('</div>')
          mealOpen = false
        }
        if (mealOpen && activeMealColumn) activeMealColumn.push(lineHtml)
        else sectionContent.push(lineHtml)
      }
    }
    finishSection()
    const dayStart = `${index === 0 ? `<h1 class="pdf-title">${escapeHtml(t.pdfSummary.dailyLogPagesTitle)}</h1>` : ''}${header}</div>`
    const firstSection = sections.shift() ?? ''
    return `<section class="pdf-page">
  <div class="pdf-page-body"><div class="pdf-day-start">${dayStart}${firstSection}</div>${sections.join('')}</div>
  ${footer}
</section>`
  }).join('\n')
}
