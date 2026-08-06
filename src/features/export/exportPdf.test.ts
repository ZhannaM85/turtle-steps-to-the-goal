import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { buildPdfSummaryData, buildSummaryPdf } from './exportPdf'

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

describe('buildPdfSummaryData', () => {
  it('scopes to the given range, inclusive on both ends', () => {
    const entries = [
      makeEntry({ date: '2026-07-06', weightKg: 79 }), // just before rangeStart — out of range
      makeEntry({ date: '2026-07-07', weightKg: 80 }), // rangeStart itself — in range
      makeEntry({ date: '2026-08-05', weightKg: 78 }), // rangeEnd itself — in range
    ]

    const data = buildPdfSummaryData(entries, '2026-07-07', '2026-08-05', 1)

    expect(data.rangeStart).toBe('2026-07-07')
    expect(data.rangeEnd).toBe('2026-08-05')
    expect(data.weightPoints).toEqual([
      { date: '2026-07-07', weightKg: 80 },
      { date: '2026-08-05', weightKg: 78 },
    ])
  })

  it('sorts weight points chronologically regardless of input order', () => {
    const entries = [
      makeEntry({ date: '2026-08-03', weightKg: 79 }),
      makeEntry({ date: '2026-08-01', weightKg: 81 }),
      makeEntry({ date: '2026-08-02', weightKg: 80 }),
    ]

    const data = buildPdfSummaryData(entries, '2026-07-07', '2026-08-05', 1)

    expect(data.weightPoints.map((p) => p.date)).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ])
  })

  it('excludes entries with no logged weight from the trend', () => {
    const entries = [makeEntry({ date: '2026-08-01', weightKg: undefined })]

    const data = buildPdfSummaryData(entries, '2026-07-07', '2026-08-05', 1)

    expect(data.weightPoints).toEqual([])
  })

  it('picks the most recently logged value for each body measurement', () => {
    const entries = [
      makeEntry({ date: '2026-08-01', waistCm: 80 }),
      makeEntry({ date: '2026-08-03', waistCm: 79 }),
      makeEntry({ date: '2026-08-02', hipCm: 95 }),
    ]

    const data = buildPdfSummaryData(entries, '2026-07-07', '2026-08-05', 1)

    expect(data.latestWaistCm).toEqual({ value: 79, date: '2026-08-03' })
    expect(data.latestHipCm).toEqual({ value: 95, date: '2026-08-02' })
    expect(data.latestBodyFatPercent).toBeNull()
  })

  it('computes weekly averages only from entries within the range', () => {
    const entries = [
      makeEntry({ date: '2026-06-01', weightKg: 90 }), // long before the range
      makeEntry({ date: '2026-08-01', weightKg: 80 }),
      makeEntry({ date: '2026-08-02', weightKg: 82 }),
    ]

    const data = buildPdfSummaryData(entries, '2026-07-07', '2026-08-05', 1)

    expect(data.weeks.length).toBeGreaterThan(0)
    for (const week of data.weeks) {
      expect(week.weekStart >= '2026-07-07').toBe(true)
    }
  })

  // #624 — the range is now a free-form picker, not a fixed 30/90-day
  // window, so a much longer span (e.g. a full year) is a real input.
  it('handles a range spanning many months', () => {
    const entries = [
      makeEntry({ date: '2025-09-01', weightKg: 85 }),
      makeEntry({ date: '2026-08-05', weightKg: 78 }),
    ]

    const data = buildPdfSummaryData(entries, '2025-09-01', '2026-08-05', 1)

    expect(data.weightPoints).toHaveLength(2)
  })
})

describe('buildSummaryPdf', () => {
  it('produces a non-empty PDF blob for a range with real data', async () => {
    const data = buildPdfSummaryData(
      [
        makeEntry({ date: '2026-08-01', weightKg: 80, waistCm: 80 }),
        makeEntry({ date: '2026-08-04', weightKg: 79 }),
      ],
      '2026-07-07',
      '2026-08-05',
      1,
    )

    const blob = await buildSummaryPdf(data, t, 'en', 'kg')

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('does not throw when there is no weight/weekly/body-measurement data at all (#609)', async () => {
    const data = buildPdfSummaryData([], '2026-07-07', '2026-08-05', 1)

    const blob = await buildSummaryPdf(data, t, 'en', 'kg')

    expect(blob.size).toBeGreaterThan(0)
  })

  it('renders a single logged weight point without dividing by zero', async () => {
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-05', weightKg: 80 })],
      '2026-07-07',
      '2026-08-05',
      1,
    )

    const blob = await buildSummaryPdf(data, t, 'en', 'kg')

    expect(blob.size).toBeGreaterThan(0)
  })

  // #623 — jsPDF's standard fonts have no Cyrillic glyphs; a Russian-locale
  // document used to render as mojibake. Embedding a real font shows up in
  // the PDF's own object dictionary, so a raw byte scan is a real check
  // (not just "no locale-specific throw"), without needing to render/OCR
  // the actual PDF page image.
  it('embeds a custom Cyrillic-capable font for a Russian-locale document', async () => {
    const ru = getDictionary('ru')
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-01', weightKg: 80 })],
      '2026-07-07',
      '2026-08-05',
      1,
    )

    const blob = await buildSummaryPdf(data, ru, 'ru', 'kg')
    const raw = await blob.text()

    expect(raw).toContain('PTSans')
  })

  // #629 — a section picker lets the user drop any of these three from the
  // generated PDF; the disclaimer itself has no toggle (#609's own
  // acceptance keeps it unconditional) so it's not covered here.
  it('does not throw when every optional section is excluded', async () => {
    const data = buildPdfSummaryData(
      [
        makeEntry({ date: '2026-08-01', weightKg: 80, waistCm: 80 }),
        makeEntry({ date: '2026-08-04', weightKg: 79 }),
      ],
      '2026-07-07',
      '2026-08-05',
      1,
    )

    const blob = await buildSummaryPdf(data, t, 'en', 'kg', {
      weightTrend: false,
      weeklyAverages: false,
      bodyMeasurements: false,
    })

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('produces a smaller document when sections are excluded than when all are included', async () => {
    const data = buildPdfSummaryData(
      [
        makeEntry({ date: '2026-08-01', weightKg: 80, waistCm: 80 }),
        makeEntry({ date: '2026-08-04', weightKg: 79 }),
      ],
      '2026-07-07',
      '2026-08-05',
      1,
    )

    const fullBlob = await buildSummaryPdf(data, t, 'en', 'kg')
    const trimmedBlob = await buildSummaryPdf(data, t, 'en', 'kg', {
      weightTrend: false,
      weeklyAverages: false,
      bodyMeasurements: false,
    })

    expect(trimmedBlob.size).toBeLessThan(fullBlob.size)
  })
})
