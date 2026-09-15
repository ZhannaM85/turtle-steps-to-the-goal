import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import {
  appendDailyLogPdfPages,
  dailyLogPdfDayLines,
} from './exportPdfDailyLog'

const t = getDictionary('en')

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-08-01',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('dailyLogPdfDayLines (#891)', () => {
  it('builds a readable day block with weight, metrics, food, water, and notes', () => {
    const lines = dailyLogPdfDayLines(
      makeEntry({
        weightKg: 80,
        sleepHours: 7.5,
        steps: 8000,
        calorieEntries: [
          {
            id: 'meal-1',
            label: 'Breakfast',
            timeEaten: '08:00',
            createdAt: '2026-08-01T08:00:00.000Z',
            items: [{ id: 'item-1', name: 'Oatmeal', amountKcal: 300 }],
            note: 'Slow morning',
          },
        ],
        waterEntries: [{ id: 'w1', amountMl: 250, timeDrunk: '09:15' }],
        note: 'Walked after lunch',
      }),
      t,
      'en',
      'kg',
    )

    const text = lines.map((line) => line.text)
    expect(text[0]).toContain('80')
    expect(text).toContain('Metrics')
    expect(text.some((line) => line.includes('Hours slept'))).toBe(true)
    expect(text.some((line) => line.startsWith('Food'))).toBe(true)
    expect(text.some((line) => line.includes('Breakfast'))).toBe(true)
    expect(text.some((line) => line.includes('Oatmeal'))).toBe(true)
    expect(text).toContain('Water')
    expect(text.some((line) => line.includes('250'))).toBe(true)
    expect(text).toContain('Notes')
    expect(text.some((line) => line.includes('Walked after lunch'))).toBe(true)
    expect(text.some((line) => line === t.exportXlsx.dateColumn)).toBe(false)
  })

  it('skips empty metric fields', () => {
    const lines = dailyLogPdfDayLines(
      makeEntry({ weightKg: 79, note: 'Just a note' }),
      t,
      'en',
      'kg',
    )
    const text = lines.map((line) => line.text)
    expect(text).not.toContain('Metrics')
    expect(text.some((line) => line.includes('Hours slept'))).toBe(false)
    expect(text).toContain('Notes')
  })

  it('includes consumed macro totals in the Food section', () => {
    const lines = dailyLogPdfDayLines(
      makeEntry({
        calorieEntries: [
          {
            id: 'meal-1',
            label: 'Lunch',
            createdAt: '2026-08-01T12:00:00.000Z',
            items: [
              {
                id: 'item-1',
                name: 'Bowl',
                amountKcal: 500,
                proteinG: 30,
                fatG: 20,
                carbsG: 45,
              },
            ],
          },
        ],
      }),
      t,
      'en',
      'kg',
    )

    expect(lines.map((line) => line.text)).toContain(
      'Food · Consumed · 500 kcal · P 30g · F 20g · C 45g',
    )
  })
})

describe('appendDailyLogPdfPages', () => {
  it('does nothing when there are no entries', async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    appendDailyLogPdfPages(doc, { entries: [] }, t, 'en', 'kg')
    expect(doc.getNumberOfPages()).toBe(1)
  })

  it('appends portrait diary pages instead of a landscape spreadsheet (#891)', async () => {
    const { jsPDF } = await import('jspdf')
    const { PT_SANS_REGULAR_BASE64 } = await import('./ptSansRegularFont')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    doc.addFileToVFS('PTSans-Regular.ttf', PT_SANS_REGULAR_BASE64)
    doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal')
    appendDailyLogPdfPages(
      doc,
      {
        entries: [
          makeEntry(),
          makeEntry({ date: '2026-08-02', weightKg: 79 }),
        ],
      },
      t,
      'en',
      'kg',
    )
    expect(doc.getNumberOfPages()).toBe(2)
    doc.setPage(2)
    expect(doc.internal.pageSize.getWidth()).toBeLessThan(
      doc.internal.pageSize.getHeight(),
    )
  })
})
