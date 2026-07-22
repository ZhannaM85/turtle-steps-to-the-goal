import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { bodyCompositionPoints } from './bodyCompositionTrend'

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

describe('bodyCompositionPoints', () => {
  it('returns nothing for no entries', () => {
    expect(bodyCompositionPoints([])).toEqual([])
  })

  it('excludes a day with none of the five fields logged', () => {
    const entries = [
      entry('2026-03-01', { weightKg: 80 }),
      entry('2026-03-02', { muscleMassKg: 30 }),
    ]

    const points = bodyCompositionPoints(entries)

    expect(points).toHaveLength(1)
    expect(points[0].date).toBe('2026-03-02')
  })

  it('carries the raw logged value for each field', () => {
    const entries = [
      entry('2026-03-01', {
        muscleMassKg: 30,
        visceralFatRating: 5,
        bodyWaterPercent: 48,
        boneMassKg: 2.3,
        bodyFatPercent: 22,
      }),
    ]

    const [point] = bodyCompositionPoints(entries)

    expect(point.raw).toEqual({
      muscleMassKg: 30,
      visceralFatRating: 5,
      bodyWaterPercent: 48,
      boneMassKg: 2.3,
      bodyFatPercent: 22,
    })
  })

  it('normalizes each series independently to 0-100 within its own range', () => {
    const entries = [
      entry('2026-03-01', { muscleMassKg: 30, bodyFatPercent: 20 }),
      entry('2026-03-02', { muscleMassKg: 32, bodyFatPercent: 25 }),
      entry('2026-03-03', { muscleMassKg: 34, bodyFatPercent: 30 }),
    ]

    const points = bodyCompositionPoints(entries)

    expect(points[0].normalized.muscleMassKg).toBe(0)
    expect(points[1].normalized.muscleMassKg).toBe(50)
    expect(points[2].normalized.muscleMassKg).toBe(100)
    // A completely different scale (20-30 vs 30-34) normalizes the same way,
    // independent of the other series' own range.
    expect(points[0].normalized.bodyFatPercent).toBe(0)
    expect(points[2].normalized.bodyFatPercent).toBe(100)
  })

  it('normalizes a series with zero variance to a flat 50, not a divide-by-zero', () => {
    const entries = [
      entry('2026-03-01', { boneMassKg: 2.3 }),
      entry('2026-03-02', { boneMassKg: 2.3 }),
    ]

    const points = bodyCompositionPoints(entries)

    expect(points[0].normalized.boneMassKg).toBe(50)
    expect(points[1].normalized.boneMassKg).toBe(50)
  })

  it('sorts points ascending by date regardless of input order', () => {
    const entries = [
      entry('2026-03-05', { muscleMassKg: 31 }),
      entry('2026-03-01', { muscleMassKg: 30 }),
    ]

    const points = bodyCompositionPoints(entries)

    expect(points.map((p) => p.date)).toEqual(['2026-03-01', '2026-03-05'])
  })
})
