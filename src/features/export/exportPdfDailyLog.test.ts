import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { dailyLogHeaderValues } from './dailyLogExport'
import { appendDailyLogPdfPages } from './exportPdfDailyLog'

const t = getDictionary('en')

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-08-01',
    createdAt: now,
    updatedAt: now,
    weightKg: 80,
    ...overrides,
  }
}

describe('appendDailyLogPdfPages', () => {
  it('does nothing when there are no entries', async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    appendDailyLogPdfPages(doc, autoTable, { entries: [] }, t)
    expect(doc.getNumberOfPages()).toBe(1)
  })

  it('appends a landscape page that uses the daily-log column headers (#865)', async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    appendDailyLogPdfPages(
      doc,
      autoTable,
      { entries: [makeEntry(), makeEntry({ date: '2026-08-02', weightKg: 79 })] },
      t,
    )
    expect(doc.getNumberOfPages()).toBe(2)
    expect(dailyLogHeaderValues(t)[0]).toBe(t.exportXlsx.dateColumn)
    const raw = doc.output('arraybuffer')
    expect(raw.byteLength).toBeGreaterThan(0)
  })
})
