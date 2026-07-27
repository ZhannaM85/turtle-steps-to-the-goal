import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CustomMetricEntry, MetricRef } from '@/domain/customMetric'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  customCorrelationFromPoints,
  customCorrelationInsight,
  customCorrelationPoints,
  pointsFromValueMaps,
  resolveMetricValueMap,
} from './customCorrelationEngine'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset), DATE_FORMAT)
}

let idCounter = 0
function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function metricEntry(
  metricId: string,
  date: string,
  value: number,
): CustomMetricEntry {
  idCounter += 1
  return {
    id: `metric-entry-${idCounter}`,
    metricId,
    date,
    value,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('resolveMetricValueMap', () => {
  it('reads a built-in field straight off DailyEntry, skipping days without it', () => {
    const entries = [
      entry(day(0), { weightKg: 80 }),
      entry(day(1)), // no weight logged
      entry(day(2), { weightKg: 81 }),
    ]

    const map = resolveMetricValueMap({ kind: 'builtin', key: 'weight' }, entries, [])

    expect(map.get(day(0))).toBe(80)
    expect(map.has(day(1))).toBe(false)
    expect(map.get(day(2))).toBe(81)
  })

  it('reads a custom metric only from entries matching its own metricId', () => {
    const customEntries = [
      metricEntry('metric-a', day(0), 1),
      metricEntry('metric-b', day(0), 99),
      metricEntry('metric-a', day(1), 0),
    ]

    const map = resolveMetricValueMap(
      { kind: 'custom', metricId: 'metric-a' },
      [],
      customEntries,
    )

    expect(map.get(day(0))).toBe(1)
    expect(map.get(day(1))).toBe(0)
    expect(map.size).toBe(2)
  })
})

describe('pointsFromValueMaps', () => {
  it('only pairs dates present on both sides, sorted ascending', () => {
    const aByDate = new Map([
      [day(2), 5],
      [day(0), 1],
      [day(1), 3],
    ])
    const bByDate = new Map([
      [day(0), 10],
      [day(1), 20],
      // day(2) missing on this side
    ])

    const points = pointsFromValueMaps(aByDate, bByDate)

    expect(points).toEqual([
      { date: day(0), aValue: 1, bValue: 10 },
      { date: day(1), aValue: 3, bValue: 20 },
    ])
  })
})

describe('customCorrelationFromPoints', () => {
  function points(pairs: Array<[number, number]>) {
    return pairs.map(([aValue, bValue], i) => ({
      date: day(i),
      aValue,
      bValue,
    }))
  }

  it('returns null with fewer than 8 points', () => {
    expect(customCorrelationFromPoints(points([[1, 1], [2, 2]]))).toBeNull()
  })

  it('reports the upper-A half averaging a higher B', () => {
    const result = customCorrelationFromPoints(
      points([
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
        [5, 10],
        [6, 10],
        [7, 10],
        [8, 10],
      ]),
    )

    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.upperAveragedMoreB).toBe(true)
    expect(result!.lowerGroupAvgB).toBeCloseTo(0, 5)
    expect(result!.upperGroupAvgB).toBeCloseTo(10, 5)
    expect(result!.thresholdAValue).toBeCloseTo(4.5, 5)
    // 10 vs 0: stdDev across all 8 points (four 0s, four 10s) is 5, gap is
    // 10 -> effect size 2.0, comfortably "strong".
    expect(result!.strength).toBe('strong')
  })

  it('reports the upper-A half averaging a lower B when that is what the data shows', () => {
    const result = customCorrelationFromPoints(
      points([
        [1, 10],
        [2, 10],
        [3, 10],
        [4, 10],
        [5, 0],
        [6, 0],
        [7, 0],
        [8, 0],
      ]),
    )

    expect(result!.upperAveragedMoreB).toBe(false)
  })
})

describe('customCorrelationPoints / customCorrelationInsight', () => {
  const aRef: MetricRef = { kind: 'custom', metricId: 'metric-a' }
  const bRef: MetricRef = { kind: 'builtin', key: 'weight' }

  it('pairs same-day values, not a next-day delta like the built-in views', () => {
    // Same day's weight, not tomorrow's — the defining difference from
    // every other correlation module in this folder (see
    // CustomCorrelation's own doc comment for why).
    const entries = [entry(day(0), { weightKg: 80 }), entry(day(1), { weightKg: 999 })]
    const customEntries = [metricEntry('metric-a', day(0), 1)]

    const points = customCorrelationPoints(aRef, bRef, entries, customEntries)

    expect(points).toEqual([{ date: day(0), aValue: 1, bValue: 80 }])
  })

  it('returns null via the full pipeline with too little data', () => {
    const entries = [entry(day(0), { weightKg: 80 })]
    const customEntries = [metricEntry('metric-a', day(0), 1)]

    expect(customCorrelationInsight(aRef, bRef, entries, customEntries)).toBeNull()
  })

  it('resolves a full built-in-vs-custom correlation end to end', () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      entry(day(i), { weightKg: i < 4 ? 70 : 80 }),
    )
    const customEntries = Array.from({ length: 8 }, (_, i) =>
      metricEntry('metric-a', day(i), i < 4 ? 0 : 1),
    )

    const result = customCorrelationInsight(aRef, bRef, entries, customEntries)

    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.upperAveragedMoreB).toBe(true)
  })
})
