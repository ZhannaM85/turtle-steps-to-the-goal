import { describe, expect, it } from 'vitest'
import { totalCalories, type DailyEntry } from '@/domain/dailyEntry'
import { rollingAverage } from './rollingAverage'

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

describe('rollingAverage', () => {
  it('returns an empty array for no entries', () => {
    expect(rollingAverage([], 'weightKg', 7)).toEqual([])
  })

  it('averages a single data point as itself', () => {
    const entries = [entry('2026-03-01', { weightKg: 80 })]

    expect(rollingAverage(entries, 'weightKg', 7)).toEqual([
      { date: '2026-03-01', average: 80 },
    ])
  })

  it('only averages over days actually present within the window (missing days)', () => {
    const entries = [
      entry('2026-03-01', { weightKg: 80 }),
      // 2026-03-02 through 2026-03-04 not logged
      entry('2026-03-05', { weightKg: 76 }),
    ]

    const result = rollingAverage(entries, 'weightKg', 7)

    expect(result).toEqual([
      { date: '2026-03-01', average: 80 },
      { date: '2026-03-05', average: 78 }, // average of 80 and 76
    ])
  })

  it('excludes values that fall outside the trailing window', () => {
    const entries = [
      entry('2026-03-01', { weightKg: 100 }),
      entry('2026-03-10', { weightKg: 80 }),
    ]

    const result = rollingAverage(entries, 'weightKg', 3)

    // 2026-03-10 is more than 3 days after 2026-03-01, so it's excluded
    expect(result[1]).toEqual({ date: '2026-03-10', average: 80 })
  })

  it('returns the same constant value when there is no variance', () => {
    const entries = [
      entry('2026-03-01', { weightKg: 80 }),
      entry('2026-03-02', { weightKg: 80 }),
      entry('2026-03-03', { weightKg: 80 }),
    ]

    const result = rollingAverage(entries, 'weightKg', 7)

    expect(result.every((point) => point.average === 80)).toBe(true)
  })

  it('returns null for a date whose window has no qualifying values', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: 2000 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ]

    expect(rollingAverage(entries, 'weightKg', 7)).toEqual([
      { date: '2026-03-01', average: null },
    ])
  })

  it('sorts output by date regardless of input order', () => {
    const entries = [
      entry('2026-03-03', { weightKg: 78 }),
      entry('2026-03-01', { weightKg: 80 }),
    ]

    const result = rollingAverage(entries, 'weightKg', 7)

    expect(result.map((p) => p.date)).toEqual(['2026-03-01', '2026-03-03'])
  })

  it('accepts a value-extractor function instead of a plain field name', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: 1800 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      entry('2026-03-02', {
        calorieEntries: [
          {
            id: 'c2',
            items: [{ id: 'i2', amountKcal: 2200 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ]

    const result = rollingAverage(
      entries,
      (e) => totalCalories(e.calorieEntries),
      7,
    )

    expect(result).toEqual([
      { date: '2026-03-01', average: 1800 },
      { date: '2026-03-02', average: 2000 },
    ])
  })

  // #175 — a multi-year import (~2,190 daily entries) profiled at 150+
  // seconds of self-time inside this function's old O(n²) shape (re-filtering
  // and re-parseISO-ing every entry for every distinct date). This doesn't
  // assert an exact millisecond budget (flaky across machines/CI load), just
  // that it stays roughly linear rather than quadratic -- 10x the entries
  // should take nowhere near 10x as long, let alone 100x.
  it('scales roughly linearly, not quadratically, with entry count (#175)', () => {
    function manyEntries(count: number): DailyEntry[] {
      const start = new Date('2020-01-01T00:00:00Z')
      const result: DailyEntry[] = []
      for (let i = 0; i < count; i++) {
        const date = new Date(start.getTime() + i * 86400000)
          .toISOString()
          .slice(0, 10)
        result.push(entry(date, { weightKg: 80 - i * 0.001 }))
      }
      return result
    }

    const small = manyEntries(200)
    const large = manyEntries(2000) // 10x the entries

    const smallStart = performance.now()
    rollingAverage(small, 'weightKg', 7)
    const smallMs = performance.now() - smallStart

    const largeStart = performance.now()
    rollingAverage(large, 'weightKg', 7)
    const largeMs = performance.now() - largeStart

    // A quadratic implementation would take ~100x as long for 10x the
    // entries; a linear one takes ~10x. Generous 30x ceiling absorbs
    // measurement noise on a small (sub-millisecond-scale) baseline
    // without masking a real quadratic regression.
    expect(largeMs).toBeLessThan(Math.max(smallMs, 1) * 30)
  })
})
