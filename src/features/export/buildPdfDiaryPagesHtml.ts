import type { Dictionary, Locale } from '@/i18n'
import type { Unit } from '@/stores/unitStore'
import { dailyLogPdfDayLines, type DailyLogPdfInput } from './exportPdfDailyLog'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const diaryHeaderIcons = {
  sleep: '<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>',
  deepSleep: '<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/><path d="m16 2 .5 1.5L18 4l-1.5.5L16 6l-.5-1.5L14 4l1.5-.5L16 2Z"/>',
  steps: '<path d="M8 3v5l3 2-2 4-4 2m9-9 2 3-2 3 4 2 2 5m-8-9 3 2"/><circle cx="11" cy="3" r="1"/>',
  mood: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 2 2.3 3 4 3s3-1 4-3M9 9h.01M15 9h.01"/>',
} as const

function diaryHeaderMetricHtml(kind: keyof typeof diaryHeaderIcons, text: string): string {
  const separator = text.indexOf(': ')
  const label = separator < 0 ? text : text.slice(0, separator)
  const value = separator < 0 ? text : text.slice(separator + 2)
  return `<span class="pdf-day-header-metric" title="${escapeHtml(label)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${diaryHeaderIcons[kind]}</svg>${escapeHtml(value)}</span>`
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
    const headerMetrics: string[] = []
    let sectionTitle = ''
    let sectionContent: string[] = []
    let mealOpen = false
    const sections: string[] = []
    const finishSection = () => {
      if (!sectionTitle) return
      if (mealOpen) {
        sectionContent.push('</div>')
        mealOpen = false
      }
      const sectionClass = sectionTitle === t.dailyEntry.waterLabel
        ? ' pdf-day-section-water'
        : sectionTitle.startsWith(t.pdfSummary.dailyLogFoodSectionTitle)
          ? ' pdf-day-section-food'
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
        header = `<div class="pdf-day-header"><h2>${escapeHtml(line.text)}</h2>`
        continue
      }
      if (line.kind && line.kind in diaryHeaderIcons) {
        headerMetrics.push(diaryHeaderMetricHtml(line.kind as keyof typeof diaryHeaderIcons, line.text))
        continue
      }
      if (line.role === 'section') {
        finishSection()
        sectionTitle = line.text
        continue
      }
      const lineHtml = line.role === 'item'
        ? `<p class="pdf-day-item">${escapeHtml(line.text)}</p>`
        : `<p class="pdf-line">${escapeHtml(line.text)}</p>`
      if (line.kind === 'meal') {
        if (mealOpen) sectionContent.push('</div>')
        sectionContent.push(`<div class="pdf-meal-card">${lineHtml}`)
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
    const dayStart = `${index === 0 ? `<h1 class="pdf-title">${escapeHtml(t.pdfSummary.dailyLogPagesTitle)}</h1>` : ''}${header}${headerMetrics.length ? `<div class="pdf-day-header-metrics">${headerMetrics.join('')}</div>` : ''}</div>`
    const firstSection = sections.shift() ?? ''
    return `<section class="pdf-page">
  <div class="pdf-page-body"><div class="pdf-day-start">${dayStart}${firstSection}</div>${sections.join('')}</div>
  ${footer}
</section>`
  }).join('\n')
}
