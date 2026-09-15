import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { buildSingleDayPdf } from './buildSingleDayPdf'

describe('buildSingleDayPdf (#894)', () => {
  it('produces one readable PDF day with the footer band', async () => {
    const entry: DailyEntry = {
      id: 'day',
      date: '2026-09-14',
      weightKg: 62.4,
      sleepHours: 7.5,
      note: 'Felt well.',
      createdAt: '2026-09-14T08:00:00.000Z',
      updatedAt: '2026-09-14T08:00:00.000Z',
    }

    const pdf = await buildSingleDayPdf(entry, getDictionary('en'), 'en', 'kg')

    expect(pdf.type).toBe('application/pdf')
    expect(pdf.size).toBeGreaterThan(0)
    expect(await pdf.text()).toContain('PTSans')
  })
})
