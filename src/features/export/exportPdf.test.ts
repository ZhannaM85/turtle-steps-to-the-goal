import { describe, expect, it } from 'vitest'
import type { CustomMetric, CustomMetricEntry } from '@/domain/customMetric'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import {
  buildCustomMetricPdfSummaries,
  buildPdfSummaryData,
  buildSummaryPdf,
  customMetricPdfOptions,
  pdfSectionAvailability,
  type PdfSections,
} from './exportPdf'

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

  // #630 — expanded from 3 fields to every tracked metric.
  it('averages sleep/steps/water only over days that logged them', () => {
    const entries = [
      makeEntry({ date: '2026-08-01', sleepHours: 7, steps: 8000 }),
      makeEntry({ date: '2026-08-02', sleepHours: 9, deepSleepHours: 2 }),
      makeEntry({
        date: '2026-08-03',
        waterEntries: [{ id: '1', amountMl: 500 }],
      }),
    ]

    const data = buildPdfSummaryData(entries, '2026-08-01', '2026-08-05', 1)

    expect(data.averageSleepHours).toEqual({ average: 8, loggedDays: 2 })
    expect(data.averageDeepSleepHours).toEqual({ average: 2, loggedDays: 1 })
    expect(data.averageSteps).toEqual({ average: 8000, loggedDays: 1 })
    expect(data.averageWaterMl).toEqual({ average: 500, loggedDays: 1 })
  })

  it('reports no data for an average field never logged in range', () => {
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-01', weightKg: 80 })],
      '2026-08-01',
      '2026-08-05',
      1,
    )

    expect(data.averageSleepHours).toBeNull()
    expect(data.averageSteps).toBeNull()
    expect(data.averageWaterMl).toBeNull()
  })

  it('counts logged and true days for cycle/digestion/alcohol/night eating independently', () => {
    const entries = [
      makeEntry({ date: '2026-08-01', onPeriod: true, hadAlcohol: false }),
      makeEntry({ date: '2026-08-02', onPeriod: false, hadConstipation: true }),
      makeEntry({ date: '2026-08-03', hadAlcohol: true }),
    ]

    const data = buildPdfSummaryData(entries, '2026-08-01', '2026-08-05', 1)

    expect(data.cycle).toEqual({ loggedDays: 2, trueDays: 1 })
    expect(data.digestion).toEqual({ loggedDays: 1, trueDays: 1 })
    expect(data.alcohol).toEqual({ loggedDays: 2, trueDays: 1 })
    expect(data.nightEating).toEqual({ loggedDays: 0, trueDays: 0 })
  })

  it('picks the most recent body-composition value for each field', () => {
    const entries = [
      makeEntry({ date: '2026-08-01', muscleMassKg: 30, boneMassKg: 3 }),
      makeEntry({ date: '2026-08-03', muscleMassKg: 31 }),
    ]

    const data = buildPdfSummaryData(entries, '2026-08-01', '2026-08-05', 1)

    expect(data.latestMuscleMassKg).toEqual({ value: 31, date: '2026-08-03' })
    expect(data.latestBoneMassKg).toEqual({ value: 3, date: '2026-08-01' })
    expect(data.latestVisceralFatRating).toBeNull()
    expect(data.latestBodyWaterPercent).toBeNull()
  })
})

describe('pdfSectionAvailability', () => {
  it('flags only the sections that have data in range', () => {
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-01', weightKg: 80, steps: 5000 })],
      '2026-08-01',
      '2026-08-05',
      1,
    )

    const availability = pdfSectionAvailability(data)

    expect(availability.weightTrend).toBe(true)
    expect(availability.steps).toBe(true)
    expect(availability.sleep).toBe(false)
    expect(availability.water).toBe(false)
    expect(availability.cycle).toBe(false)
    expect(availability.bodyComposition).toBe(false)
  })

  // A field that's real but all-false (e.g. never on period) still counts
  // as available — "no" is data too, not the same as "never logged."
  it('treats an all-false boolean field as available', () => {
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-01', onPeriod: false })],
      '2026-08-01',
      '2026-08-05',
      1,
    )

    expect(pdfSectionAvailability(data).cycle).toBe(true)
  })
})

describe('buildCustomMetricPdfSummaries / customMetricPdfOptions', () => {
  function makeMetric(overrides: Partial<CustomMetric> = {}): CustomMetric {
    return {
      id: 'metric-1',
      name: 'Acne',
      inputKind: 'scale5',
      createdAt: new Date().toISOString(),
      ...overrides,
    }
  }

  function makeMetricEntry(
    overrides: Partial<CustomMetricEntry> = {},
  ): CustomMetricEntry {
    return {
      id: crypto.randomUUID(),
      metricId: 'metric-1',
      date: '2026-08-01',
      value: 3,
      updatedAt: new Date().toISOString(),
      ...overrides,
    }
  }

  it('averages only entries within range and omits metrics with none', () => {
    const metrics = [makeMetric(), makeMetric({ id: 'metric-2', name: 'Reps', unit: 'reps' })]
    const entries = [
      makeMetricEntry({ date: '2026-08-01', value: 2 }),
      makeMetricEntry({ date: '2026-08-02', value: 4 }),
      makeMetricEntry({ date: '2026-06-01', value: 5 }), // out of range
    ]

    const summaries = buildCustomMetricPdfSummaries(
      metrics,
      entries,
      '2026-08-01',
      '2026-08-05',
    )

    expect(summaries).toEqual([
      { metricId: 'metric-1', name: 'Acne', unit: undefined, average: 3, loggedDays: 2 },
    ])
  })

  it('flags every defined metric with whether it has data, not just the ones with some', () => {
    const metrics = [makeMetric(), makeMetric({ id: 'metric-2', name: 'Reps' })]
    const entries = [makeMetricEntry({ date: '2026-08-01' })]

    const summaries = buildCustomMetricPdfSummaries(
      metrics,
      entries,
      '2026-08-01',
      '2026-08-05',
    )
    const options = customMetricPdfOptions(metrics, summaries)

    expect(options).toEqual([
      { id: 'metric-1', name: 'Acne', available: true },
      { id: 'metric-2', name: 'Reps', available: false },
    ])
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

  // #629/#630 — a section picker lets the user drop any section from the
  // generated PDF; the disclaimer itself has no toggle (#609's own
  // acceptance keeps it unconditional) so it's not covered here.
  const ALL_SECTIONS_EXCLUDED: PdfSections = {
    weightTrend: false,
    weeklyAverages: false,
    bodyMeasurements: false,
    bodyComposition: false,
    sleep: false,
    steps: false,
    water: false,
    cycle: false,
    digestion: false,
    alcohol: false,
    nightEating: false,
    customMetricIds: [],
  }

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

    const blob = await buildSummaryPdf(data, t, 'en', 'kg', ALL_SECTIONS_EXCLUDED)

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
    const trimmedBlob = await buildSummaryPdf(
      data,
      t,
      'en',
      'kg',
      ALL_SECTIONS_EXCLUDED,
    )

    expect(trimmedBlob.size).toBeLessThan(fullBlob.size)
  })

  // #630 — every new section (bodyComposition/sleep/steps/water/day
  // signals) plus a selected custom metric, all in one range with real
  // data for each — the main regression risk is one of these throwing or
  // silently producing an empty document, not exact visual layout.
  it('renders every new #630 section without throwing when all have data', async () => {
    const data = buildPdfSummaryData(
      [
        makeEntry({
          date: '2026-08-01',
          sleepHours: 7,
          deepSleepHours: 1.5,
          steps: 6000,
          waterEntries: [{ id: '1', amountMl: 1500 }],
          onPeriod: true,
          hadConstipation: false,
          hadAlcohol: true,
          muscleMassKg: 30,
          visceralFatRating: 8,
          bodyWaterPercent: 55,
          boneMassKg: 3,
        }),
      ],
      '2026-07-07',
      '2026-08-05',
      1,
    )

    const blob = await buildSummaryPdf(
      data,
      t,
      'en',
      'kg',
      {
        weightTrend: false,
        weeklyAverages: false,
        bodyMeasurements: false,
        bodyComposition: true,
        sleep: true,
        steps: true,
        water: true,
        cycle: true,
        digestion: true,
        alcohol: true,
        nightEating: false,
        customMetricIds: ['metric-1'],
      },
      [
        {
          metricId: 'metric-1',
          name: 'Acne',
          unit: undefined,
          average: 2.5,
          loggedDays: 4,
        },
      ],
    )

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('omits a custom metric summary that was not selected', async () => {
    const data = buildPdfSummaryData([], '2026-07-07', '2026-08-05', 1)

    const withMetric = await buildSummaryPdf(
      data,
      t,
      'en',
      'kg',
      { ...ALL_SECTIONS_EXCLUDED, customMetricIds: ['metric-1'] },
      [{ metricId: 'metric-1', name: 'Acne', average: 3, loggedDays: 2 }],
    )
    const withoutMetric = await buildSummaryPdf(
      data,
      t,
      'en',
      'kg',
      ALL_SECTIONS_EXCLUDED,
      [{ metricId: 'metric-1', name: 'Acne', average: 3, loggedDays: 2 }],
    )

    expect(withoutMetric.size).toBeLessThan(withMetric.size)
  })
})
