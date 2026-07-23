import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { proteinCorrelation, proteinPoints } from './proteinCorrelation'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

// #322 — a fixed, realistic total-calorie denominator (rather than the
// pre-#322 fixture's arbitrary amountKcal: 100, which no longer means
// anything once protein is expressed as a share of calories) so the
// percentages this produces stay plausible; kept constant across a given
// test so ordering by proteinG still orders by proteinPercent too.
function protein(proteinG: number, kcal = 2000): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal: kcal, proteinG }],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
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

describe('proteinCorrelation', () => {
  it('returns null with no entries', () => {
    expect(proteinCorrelation([])).toBeNull()
  })

  it('returns null with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: protein(80) }),
      entry(day(1), { weightKg: 80.1, calorieEntries: protein(50) }),
      entry(day(2), { weightKg: 80.5 }),
    ]

    expect(proteinCorrelation(entries)).toBeNull()
  })

  it('reports the less-protein half averaging more next-day gain', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: protein(40) }),
      entry(day(1), { weightKg: 80.8, calorieEntries: protein(45) }),
      entry(day(2), { weightKg: 81.7, calorieEntries: protein(50) }),
      entry(day(3), { weightKg: 82.5, calorieEntries: protein(55) }),
      entry(day(4), { weightKg: 82.6, calorieEntries: protein(100) }),
      entry(day(5), { weightKg: 82.65, calorieEntries: protein(105) }),
      entry(day(6), { weightKg: 82.75, calorieEntries: protein(110) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: protein(115) }),
      entry(day(8), { weightKg: 82.85 }),
    ]

    const result = proteinCorrelation(entries)
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.lessAveragedMoreGain).toBe(true)
    // #224 — a 0.59kg gap between the two groups' averages clears the
    // 0.15kg "strong" daily threshold.
    expect(result!.strength).toBe('strong')
  })

  it('reports the more-protein half averaging more gain when that is what the data shows', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: protein(40) }),
      entry(day(1), { weightKg: 80.1, calorieEntries: protein(45) }),
      entry(day(2), { weightKg: 80.2, calorieEntries: protein(50) }),
      entry(day(3), { weightKg: 80.25, calorieEntries: protein(55) }),
      entry(day(4), { weightKg: 80.4, calorieEntries: protein(100) }),
      entry(day(5), { weightKg: 81.2, calorieEntries: protein(105) }),
      entry(day(6), { weightKg: 81.9, calorieEntries: protein(110) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: protein(115) }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = proteinCorrelation(entries)
    expect(result!.lessAveragedMoreGain).toBe(false)
  })

  it('ignores a day with no protein logged', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0 }),
      entry(day(1), { weightKg: 80.5 }),
    ]

    expect(proteinCorrelation(entries)).toBeNull()
  })

  it('ignores a day whose next calendar date has no logged weight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: protein(70) }),
      // day(1) missing entirely — no next-day weight to pair with.
      entry(day(2), { weightKg: 81.0, calorieEntries: protein(70) }),
      entry(day(3), { weightKg: 81.5 }),
    ]

    expect(proteinCorrelation(entries)).toBeNull()
  })

  describe('protein as percent of calories, not raw grams (#322)', () => {
    it('computes each point as protein-kcal / total-kcal, not a bare gram amount', () => {
      const entries = [
        entry(day(0), { weightKg: 80.0, calorieEntries: protein(100, 2000) }),
        entry(day(1), { weightKg: 80.5 }),
      ]

      const points = proteinPoints(entries)
      expect(points).toHaveLength(1)
      // 100g protein * 4 kcal/g = 400 kcal, of a 2000 kcal day -> 20%.
      expect(points[0].proteinPercent).toBeCloseTo(20)
    })

    it('ranks a smaller total-calorie day with the same protein share above a bigger day with more raw grams but a lower share', () => {
      const entries = [
        // Big eating day overall: 150g protein, but only 20% of a 3000
        // kcal total — more raw grams than the day below, lower share.
        entry(day(0), { weightKg: 80.0, calorieEntries: protein(150, 3000) }),
        entry(day(1), { weightKg: 80.5 }),
        // Smaller, higher-protein-share day: 80g protein of just 800
        // kcal total (40%) — fewer raw grams, but a bigger share.
        entry(day(4), { weightKg: 80.5, calorieEntries: protein(80, 800) }),
        entry(day(5), { weightKg: 81.0 }),
      ]

      const points = proteinPoints(entries)
      const bigDayPoint = points.find((p) => p.date === day(1))!
      const smallerHigherSharePoint = points.find((p) => p.date === day(5))!

      expect(bigDayPoint.proteinPercent).toBeCloseTo(20)
      expect(smallerHigherSharePoint.proteinPercent).toBeCloseTo(40)
      expect(smallerHigherSharePoint.proteinPercent).toBeGreaterThan(
        bigDayPoint.proteinPercent,
      )
    })

    it('ignores a day with a logged protein total but no calories to divide it by', () => {
      const entries = [
        entry(day(0), {
          weightKg: 80.0,
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              // amountKcal: 0 makes totalCalories() sum to 0 -- can't
              // express protein as a share of a zero-calorie day.
              items: [{ id: crypto.randomUUID(), amountKcal: 0, proteinG: 30 }],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        }),
        entry(day(1), { weightKg: 80.5 }),
      ]

      expect(proteinPoints(entries)).toHaveLength(0)
    })
  })
})
