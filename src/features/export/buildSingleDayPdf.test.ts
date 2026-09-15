import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { buildSingleDayPdfDocumentHtml } from './buildPdfDocumentHtml'
import { buildSingleDayPdf } from './buildSingleDayPdf'

describe('buildSingleDayPdf (#894/#905)', () => {
  it('produces a PDF blob and HTML with day content + footer', async () => {
    const entry: DailyEntry = {
      id: 'day',
      date: '2026-09-14',
      weightKg: 62.4,
      sleepHours: 7.5,
      note: 'Felt well.',
      createdAt: '2026-09-14T08:00:00.000Z',
      updatedAt: '2026-09-14T08:00:00.000Z',
    }

    const t = getDictionary('en')
    const html = buildSingleDayPdfDocumentHtml(
      { entries: [entry] },
      t,
      'en',
      'kg',
      'Generated on 14 Sep 2026',
    )
    expect(html).toContain('Felt well.')
    expect(html).toContain('pdf-footer')

    const pdf = await buildSingleDayPdf(entry, t, 'en', 'kg')
    expect(pdf.type).toBe('application/pdf')
    expect(pdf.size).toBeGreaterThan(0)
  })
})
