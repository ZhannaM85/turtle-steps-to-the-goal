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
  mood: true,
} as const

function diaryHeaderMetricHtml(text: string): string {
  return `<span class="pdf-day-header-metric">${escapeHtml(text)}</span>`
}

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
    const sections: string[] = []
    const finishSection = () => {
      if (!sectionTitle) return
      if (mealOpen) {
        sectionContent.push('</div>')
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
        ? `<span class="pdf-day-section-title-metrics">${metricsHeaderValues.join('')}</span><span class="pdf-day-section-title-lead">${escapeHtml(sectionTitle)}</span>`
        : sectionClass.includes('pdf-day-section-water') && waterTitleParts.length > 1
          ? `<span class="pdf-day-section-title-lead"><span>${escapeHtml(waterTitleParts[0] ?? '')}</span> <span class="pdf-day-section-water-total">${escapeHtml(waterTitleParts.slice(1).join('  ·  '))}</span></span>`
          : `<span>${escapeHtml(sectionTitle)}</span>`
      sections.push(`<section class="pdf-day-section${sectionClass}">
  <h3 class="pdf-day-section-title">${titleHtml}</h3>
  <div class="pdf-day-section-content">${sectionContent.join('')}</div>
</section>`)
      sectionTitle = ''
      sectionContent = []
    }
    for (const line of lines) {
      if (line.role === 'header') {
        header = `<div class="pdf-day-header"><h2>${escapeHtml(line.text)}</h2>`
        continue
      }
      if (line.kind && line.kind in diaryHeaderMetricKinds) {
        metricsHeaderValues.push(diaryHeaderMetricHtml(line.text))
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
        if (mealOpen) sectionContent.push('</div>')
        const mealColumn = mealIndex % 2 === 0 ? 'left' : 'right'
        sectionContent.push(`<div class="pdf-meal-card pdf-meal-${mealColumn}">${lineHtml}`)
        mealIndex += 1
        mealOpen = true
      } else {
        if (line.kind === 'dayTotal' && mealOpen) {
          sectionContent.push('</div>')
          mealOpen = false
        }
        sectionContent.push(lineHtml)
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
