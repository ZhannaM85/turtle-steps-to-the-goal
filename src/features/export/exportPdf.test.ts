import { describe, expect, it } from 'vitest'
import type { CustomMetric, CustomMetricEntry } from '@/domain/customMetric'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { buildPdfDocumentHtml } from './buildPdfDocumentHtml'
import { PDF_DOCUMENT_CSS } from './pdfDocumentStyles'
import {
  buildCustomMetricPdfSummaries,
  buildPdfSummaryData,
  buildSummaryPdf,
  customMetricPdfOptions,
  gatePdfSectionAvailability,
  pdfSectionAvailability,
  type PdfSectionTrackingGate,
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

  // #634 — body fat % is edited/saved alongside muscle mass/visceral fat/
  // water/bone mass on the Day form (the "Body composition" card), not
  // waist/hip's "Body measurements" card, so body-fat-only data (e.g. a
  // smart-scale import with no waist/hip ever logged) must not enable the
  // "Body measurements" section on its own.
  it('enables bodyComposition (not bodyMeasurements) from body-fat data alone', () => {
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-01', bodyFatPercent: 22 })],
      '2026-08-01',
      '2026-08-05',
      1,
    )

    const availability = pdfSectionAvailability(data)

    expect(availability.bodyComposition).toBe(true)
    expect(availability.bodyMeasurements).toBe(false)
  })
})

describe('gatePdfSectionAvailability', () => {
  const ALL_TRACKED: PdfSectionTrackingGate = {
    sleep: true,
    steps: true,
    bodyMeasurements: true,
    bodyComposition: true,
    nightEating: true,
    cycle: true,
    digestion: true,
    alcohol: true,
    water: true,
  }

  // #633 — a section with real logged data (e.g. alcohol entries from
  // before the user turned tracking off in Settings) shouldn't show as
  // selectable once Settings says it isn't currently tracked.
  it('turns off a section with data once its Settings toggle is off', () => {
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-01', hadAlcohol: true, waistCm: 80 })],
      '2026-08-01',
      '2026-08-05',
      1,
    )
    const availability = pdfSectionAvailability(data)
    expect(availability.alcohol).toBe(true)
    expect(availability.bodyMeasurements).toBe(true)

    const gated = gatePdfSectionAvailability(availability, {
      ...ALL_TRACKED,
      alcohol: false,
      bodyMeasurements: false,
    })

    expect(gated.alcohol).toBe(false)
    expect(gated.bodyMeasurements).toBe(false)
  })

  it("doesn't turn on a section that has no data just because its toggle is on", () => {
    const data = buildPdfSummaryData([], '2026-08-01', '2026-08-05', 1)
    const gated = gatePdfSectionAvailability(
      pdfSectionAvailability(data),
      ALL_TRACKED,
    )

    expect(gated.alcohol).toBe(false)
    expect(gated.bodyMeasurements).toBe(false)
  })

  it('never gates weightTrend/weeklyAverages — weight has no tracking toggle', () => {
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-01', weightKg: 80 })],
      '2026-08-01',
      '2026-08-05',
      1,
    )
    const availability = pdfSectionAvailability(data)

    const gated = gatePdfSectionAvailability(availability, {
      sleep: false,
      steps: false,
      bodyMeasurements: false,
      bodyComposition: false,
      nightEating: false,
      cycle: false,
      digestion: false,
      alcohol: false,
      water: false,
    })

    expect(gated.weightTrend).toBe(availability.weightTrend)
    expect(gated.weeklyAverages).toBe(availability.weeklyAverages)
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
    const metrics = [
      makeMetric(),
      makeMetric({ id: 'metric-2', name: 'Reps', unit: 'reps' }),
    ]
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
      {
        metricId: 'metric-1',
        name: 'Acne',
        unit: undefined,
        average: 3,
        loggedDays: 2,
      },
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

  // #623 / #905 — Russian copy must survive the HTML→PDF path. Under jsdom
  // we only get a stub PDF blob, so assert the HTML builder still emits
  // Cyrillic labels (system/web fonts cover glyphs in the real browser).
  it('builds Russian-locale HTML with Cyrillic labels (#623/#905)', async () => {
    const ru = getDictionary('ru')
    const data = buildPdfSummaryData(
      [makeEntry({ date: '2026-08-01', weightKg: 80 })],
      '2026-07-07',
      '2026-08-05',
      1,
    )

    const html = buildPdfDocumentHtml(data, ru, 'ru', 'kg', {
      weightTrend: true,
      weeklyAverages: true,
      bodyMeasurements: true,
      bodyComposition: true,
      sleep: true,
      steps: true,
      water: true,
      cycle: true,
      digestion: true,
      alcohol: true,
      nightEating: true,
      customMetricIds: [],
    })
    expect(html).toMatch(/[А-Яа-яЁё]/)

    const blob = await buildSummaryPdf(data, ru, 'ru', 'kg')
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
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

    const blob = await buildSummaryPdf(
      data,
      t,
      'en',
      'kg',
      ALL_SECTIONS_EXCLUDED,
    )

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

    // #905 — under Vitest, PDF blobs are stubs of equal size; compare the
    // HTML document that feeds the PDF renderer instead.
    const fullHtml = buildPdfDocumentHtml(data, t, 'en', 'kg', {
      weightTrend: true,
      weeklyAverages: true,
      bodyMeasurements: true,
      bodyComposition: true,
      sleep: true,
      steps: true,
      water: true,
      cycle: true,
      digestion: true,
      alcohol: true,
      nightEating: true,
      customMetricIds: [],
    })
    const trimmedHtml = buildPdfDocumentHtml(
      data,
      t,
      'en',
      'kg',
      ALL_SECTIONS_EXCLUDED,
    )

    expect(trimmedHtml.length).toBeLessThan(fullHtml.length)
    expect(await buildSummaryPdf(data, t, 'en', 'kg')).toMatchObject({
      type: 'application/pdf',
    })
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
    const summaries = [
      { metricId: 'metric-1', name: 'Acne', average: 3, loggedDays: 2 },
    ]

    const withMetric = buildPdfDocumentHtml(
      data,
      t,
      'en',
      'kg',
      { ...ALL_SECTIONS_EXCLUDED, customMetricIds: ['metric-1'] },
      summaries,
    )
    const withoutMetric = buildPdfDocumentHtml(
      data,
      t,
      'en',
      'kg',
      ALL_SECTIONS_EXCLUDED,
      summaries,
    )

    expect(withMetric).toContain('Acne')
    expect(withoutMetric).not.toContain('Acne')
  })

  it('appends daily-log pages only when they are requested (#865)', async () => {
    const entries = [
      makeEntry({ date: '2026-08-01', weightKg: 80 }),
      makeEntry({ date: '2026-08-02', weightKg: 79 }),
    ]
    const data = buildPdfSummaryData(entries, '2026-07-07', '2026-08-05', 1)
    const summaryOnly = buildPdfDocumentHtml(
      data,
      t,
      'en',
      'kg',
      ALL_SECTIONS_EXCLUDED,
    )
    const withDailyLog = buildPdfDocumentHtml(
      data,
      t,
      'en',
      'kg',
      ALL_SECTIONS_EXCLUDED,
      [],
      { entries },
    )

    expect(withDailyLog.length).toBeGreaterThan(summaryOnly.length)
    expect(withDailyLog).toContain('class="pdf-day-header"')
    expect(summaryOnly).not.toContain('class="pdf-day-header"')
  })

  it('starts each diary date on a new page while keeping its first card (#920)', () => {
    const entries = [
      makeEntry({ date: '2026-08-01', weightKg: 80, note: 'One' }),
      makeEntry({ date: '2026-08-02', weightKg: 79, note: 'Two' }),
      makeEntry({ date: '2026-08-03', weightKg: 78, note: 'Three' }),
    ]
    const data = buildPdfSummaryData(entries, '2026-07-07', '2026-08-05', 1)
    const html = buildPdfDocumentHtml(
      data,
      t,
      'en',
      'kg',
      ALL_SECTIONS_EXCLUDED,
      [],
      { entries },
    )
    const container = document.createElement('div')
    container.innerHTML = html
    const pages = [...container.querySelectorAll('.pdf-page')]
    expect(pages).toHaveLength(4) // Summary, then one start page per date.
    for (const page of pages.slice(1)) {
      const start = page.querySelector('.pdf-day-start')
      expect(page.querySelectorAll('.pdf-day-header')).toHaveLength(1)
      expect(start?.querySelector('.pdf-day-header')).not.toBeNull()
      expect(start?.querySelector('.pdf-day-section')).not.toBeNull()
    }
    expect(container.querySelectorAll('.pdf-day-header')).toHaveLength(3)
    expect(html).not.toContain('<article class="pdf-day">')
  })

  it('packs diary signals beside Metrics and meals into paired cards without losing the night food note (#925)', () => {
    const entry = makeEntry({
      sleepHours: 7.5,
      deepSleepHours: 2,
      steps: 4200,
      emotion: 'happy',
      nightEatingOverride: false,
      nightEatingNoWhatHelped: 'Tea helped me sleep',
      calorieEntries: [
        { id: 'breakfast', createdAt: '2026-08-01T08:00:00Z', label: 'Breakfast', items: [{ id: 'eggs', name: 'Eggs', amountKcal: 200 }] },
        { id: 'lunch', createdAt: '2026-08-01T12:00:00Z', label: 'Lunch', items: [{ id: 'soup', name: 'Soup', amountKcal: 300 }] },
        { id: 'dinner', createdAt: '2026-08-01T18:00:00Z', label: 'Dinner', items: [{ id: 'rice', name: 'Rice', amountKcal: 400 }] },
      ],
    })
    const data = buildPdfSummaryData([entry], entry.date, entry.date, 1)
    const html = buildPdfDocumentHtml(data, t, 'en', 'kg', ALL_SECTIONS_EXCLUDED, [], { entries: [entry] })
    const container = document.createElement('div')
    container.innerHTML = html
    const day = container.querySelectorAll('.pdf-page')[1]!
    expect(day.querySelector('.pdf-day-header')?.textContent).not.toContain('7h 30m')
    const metricsTitle = day.querySelector('.pdf-day-section-title-metrics')
    expect(metricsTitle?.querySelectorAll('.pdf-day-header-metric')).toHaveLength(4)
    expect(metricsTitle?.textContent).toContain('7h 30m')
    expect(day.querySelectorAll('.pdf-meal-card')).toHaveLength(3)
    expect(html).toContain('padding-left: 10pt')
    expect(html).toContain('padding-bottom: 9pt')
    expect(html).toContain('.pdf-meal-card .pdf-line + .pdf-day-item { margin-top: 4pt; }')
    expect(html).toContain('font-weight: 600; font-size: 9.5pt')
    const mealItemRule = PDF_DOCUMENT_CSS.match(/\.pdf-meal-card \.pdf-day-item \{([^}]*)\}/)?.[1]
    expect(mealItemRule).toContain('font-size: 9pt')
    expect(day.querySelector('.pdf-day-section-food')?.textContent).toContain('Eggs')
    expect(day.querySelector('.pdf-day-section-food')?.textContent).toContain('Rice')
    expect(day.textContent).toContain('Tea helped me sleep')
    expect(html).toContain('float: left')
    expect(html).toContain('display: inline-flex')
    expect(html).toContain('white-space: nowrap')
    expect(html).not.toContain('grid-template-columns')
  })

  it('uses 9pt body text in Metrics and Notes diary cards (#929)', () => {
    const entry = makeEntry({
      waistCm: 80,
      note: 'Felt lighter today',
    })
    const data = buildPdfSummaryData([entry], entry.date, entry.date, 1)
    const html = buildPdfDocumentHtml(data, t, 'en', 'kg', ALL_SECTIONS_EXCLUDED, [], { entries: [entry] })
    const container = document.createElement('div')
    container.innerHTML = html
    const day = container.querySelectorAll('.pdf-page')[1]!
    expect(day.querySelector('.pdf-day-section-metrics')?.textContent).toContain('80')
    expect(day.querySelector('.pdf-day-section-notes')?.textContent).toContain('Felt lighter today')
    const metricsLabel = day.querySelector('.pdf-day-section-metrics .pdf-day-line-label')
    expect(metricsLabel?.textContent).toMatch(/:$/)
    expect(metricsLabel?.parentElement?.textContent).toContain('80')
    expect(metricsLabel?.textContent).not.toContain('80')
    expect(html).toContain('.pdf-day-section-metrics .pdf-day-section-content .pdf-line')
    expect(html).toContain('.pdf-day-section-notes .pdf-day-section-content .pdf-line')
    expect(html).toContain('font-size: 9pt')
    expect(html).toContain('.pdf-day-section-water .pdf-day-section-content')
    expect(html).toContain('.pdf-day-section-notes .pdf-day-section-content')
    expect(html).toContain('padding-left: 9pt')
    expect(html).toContain('padding-bottom: 12pt')
  })

  it('pads day, section, and table headers so PDF text sits in the middle (#928)', () => {
    expect(PDF_DOCUMENT_CSS).toContain('padding: 1pt 9pt 11pt')
    expect(PDF_DOCUMENT_CSS).toContain(
      '.pdf-day-start > .pdf-title { margin-bottom: 12pt; }',
    )
    expect(PDF_DOCUMENT_CSS).toContain('.pdf-day-section-title')
    expect(PDF_DOCUMENT_CSS).toContain('font-size: 10.5pt')
    expect(PDF_DOCUMENT_CSS).toContain('.pdf-day-section-metrics .pdf-day-section-title')
    expect(PDF_DOCUMENT_CSS).toContain('align-items: center')
    expect(PDF_DOCUMENT_CSS).toContain('justify-content: space-between')
    expect(PDF_DOCUMENT_CSS).toContain('padding: 1pt 6pt 11pt')
    expect(PDF_DOCUMENT_CSS).toContain('align-items: baseline')
    expect(PDF_DOCUMENT_CSS).toContain('vertical-align: -1.5pt')
    expect(PDF_DOCUMENT_CSS).toContain('transform: translateY(1pt)')
    expect(PDF_DOCUMENT_CSS).toContain('padding: 4pt 6pt')
    expect(PDF_DOCUMENT_CSS).not.toContain('padding: 8pt 6pt 2pt')
    const footerRule = PDF_DOCUMENT_CSS.match(/\.pdf-footer \{([^}]*)\}/)?.[1]
    expect(footerRule).toContain('padding-left: 9pt')
    expect(footerRule).toContain('padding-bottom: 9pt')
    expect(PDF_DOCUMENT_CSS).toContain(
      '.pdf-day-header h2 { font-size: 11pt; font-weight: 600; line-height: 1.2; margin: 0; }',
    )
    const entry = makeEntry({ note: 'Centered headers', waistCm: 80 })
    const data = buildPdfSummaryData([entry], entry.date, entry.date, 1)
    const html = buildPdfDocumentHtml(data, t, 'en', 'kg', ALL_SECTIONS_EXCLUDED, [], { entries: [entry] })
    const container = document.createElement('div')
    container.innerHTML = html
    const day = container.querySelectorAll('.pdf-page')[1]!
    expect(day.querySelector('.pdf-day-header h2')).not.toBeNull()
    expect(day.querySelector('.pdf-day-section-title > span')).not.toBeNull()
  })

  it('shows the water total beside the Water diary title (#930)', () => {
    const entry = makeEntry({
      waterEntries: [{ id: 'w1', amountMl: 250, timeDrunk: '09:15' }],
    })
    const data = buildPdfSummaryData([entry], entry.date, entry.date, 1)
    const html = buildPdfDocumentHtml(data, t, 'en', 'kg', ALL_SECTIONS_EXCLUDED, [], { entries: [entry] })
    const container = document.createElement('div')
    container.innerHTML = html
    const water = container.querySelectorAll('.pdf-page')[1]?.querySelector('.pdf-day-section-water')
    const title = water?.querySelector('.pdf-day-section-title')
    expect(title?.textContent).toContain('Water')
    expect(title?.textContent).toContain('250')
    expect(title?.textContent).not.toContain('Water250')
    expect(title?.querySelector('.pdf-day-section-title-lead')).not.toBeNull()
    expect(title?.querySelector('.pdf-day-section-water-total')?.textContent).toContain('250')
    expect(title?.querySelector('.pdf-day-section-title-metrics')).toBeNull()
    expect(html).toContain('pdf-day-section-water-total')
    expect(html).not.toContain('justify-content: flex-start')
    expect(water?.querySelector('.pdf-day-section-content .pdf-line')).toBeNull()
    expect(water?.querySelector('.pdf-day-item')?.textContent).toContain('09:15')
  })

  it('shows a Steps text label instead of the walking icon (#931)', () => {
    const entry = makeEntry({
      steps: 4200,
      waistCm: 80,
    })
    const data = buildPdfSummaryData([entry], entry.date, entry.date, 1)
    const enHtml = buildPdfDocumentHtml(data, t, 'en', 'kg', ALL_SECTIONS_EXCLUDED, [], { entries: [entry] })
    const ru = getDictionary('ru')
    const ruHtml = buildPdfDocumentHtml(data, ru, 'ru', 'kg', ALL_SECTIONS_EXCLUDED, [], { entries: [entry] })
    const container = document.createElement('div')
    container.innerHTML = enHtml
    const metricsTitle = container.querySelectorAll('.pdf-page')[1]?.querySelector('.pdf-day-section-title-metrics')
    const stepsMetric = [...(metricsTitle?.querySelectorAll('.pdf-day-header-metric') ?? [])].find((el) =>
      el.textContent?.includes('Steps'),
    )
    expect(stepsMetric?.textContent).toContain('Steps')
    expect(stepsMetric?.querySelector('svg')).toBeNull()
    expect(enHtml).not.toContain('M8 3v5l3 2')
    expect(ruHtml).toContain('Шаги')
  })

  it('uses two-column summary cards while charts and tables span the page (#921)', () => {
    const entries = [
      makeEntry({
        weightKg: 80,
        sleepHours: 8,
        steps: 6000,
        waterEntries: [{ id: 'water-1', amountMl: 1500 }],
      }),
    ]
    const data = buildPdfSummaryData(entries, '2026-08-01', '2026-08-01', 1)
    const html = buildPdfDocumentHtml(data, t, 'en', 'kg', {
      ...ALL_SECTIONS_EXCLUDED,
      weightTrend: true,
      weeklyAverages: true,
      sleep: true,
      steps: true,
      water: true,
    })
    const container = document.createElement('div')
    container.innerHTML = html
    const body = container.querySelector('.pdf-summary-body')
    expect(body).not.toBeNull()
    const cards = [...(body?.querySelectorAll(':scope > .pdf-section') ?? [])]
    expect(cards).toHaveLength(5)
    expect(cards.slice(0, 2).every((card) => card.classList.contains('pdf-section-wide'))).toBe(true)
    expect(cards.slice(2).every((card) => !card.classList.contains('pdf-section-wide'))).toBe(true)
  })
})
