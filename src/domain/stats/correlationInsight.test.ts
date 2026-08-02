import { addDays, format, startOfISOWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import {
  correlationInsight,
  correlationInsightPoints,
} from './correlationInsight'

const DATE_FORMAT = 'yyyy-MM-dd'
const WEEK_1_START = format(
  startOfISOWeek(new Date('2026-03-02T00:00:00.000Z')),
  DATE_FORMAT,
)

function weekStart(weekIndex: number): string {
  return format(
    addDays(new Date(`${WEEK_1_START}T00:00:00.000Z`), weekIndex * 7),
    DATE_FORMAT,
  )
}

function calories(amountKcal: number): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal }],
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

/** One-day-per-week fixtures only land on weekStart, so the last week's
 * calendar end is still after max(entry.date). A weight-only day on the
 * next weekStart extends the data window so prior weeks count as finished
 * (#522 incomplete-week gate). */
function withCompletedWindow(
  entries: DailyEntry[],
  lastComparableWeekIndex: number,
): DailyEntry[] {
  const lastWeight =
    [...entries].reverse().find((e) => e.weightKg !== undefined)?.weightKg ?? 80
  return [
    ...entries,
    entry(weekStart(lastComparableWeekIndex + 1), { weightKg: lastWeight }),
  ]
}

describe('correlationInsight', () => {
  it('returns null with no entries', () => {
    expect(correlationInsight([])).toBeNull()
  })

  it('returns null with fewer than 4 comparable weeks', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1800) }),
        entry(weekStart(2), { weightKg: 86, calorieEntries: calories(2200) }),
      ],
      2,
    )

    expect(correlationInsight(entries)).toBeNull()
  })

  it('reports the lower-calorie half averaging more loss', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }), // delta -2
        entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }), // delta -2
        entry(weekStart(3), { weightKg: 85.5, calorieEntries: calories(2200) }), // delta -0.5
        entry(weekStart(4), { weightKg: 85.3, calorieEntries: calories(2300) }), // delta -0.2
      ],
      4,
    )

    const insight = correlationInsight(entries)
    expect(insight).not.toBeNull()
    expect(insight!.weekCount).toBe(4)
    expect(insight!.lowerAveragedMoreLoss).toBe(true)
    expect(insight!.lowerGroupAvgDeltaKg).toBeCloseTo(-2, 5)
    expect(insight!.higherGroupAvgDeltaKg).toBeCloseTo(-0.35, 5)
    // #224 — a 1.65kg gap between the two groups' averages clears the
    // 0.35kg "strong" weekly threshold (weekly deltas use a larger scale
    // than the day-pair correlations' 0.15kg one).
    expect(insight!.strength).toBe('strong')
  })

  it('reports the higher-calorie half averaging more loss when that is what the data shows', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 89.8, calorieEntries: calories(1700) }), // delta -0.2
        entry(weekStart(2), { weightKg: 89.5, calorieEntries: calories(1800) }), // delta -0.3
        entry(weekStart(3), { weightKg: 87.5, calorieEntries: calories(2200) }), // delta -2
        entry(weekStart(4), { weightKg: 85.5, calorieEntries: calories(2300) }), // delta -2
      ],
      4,
    )

    const insight = correlationInsight(entries)
    expect(insight!.lowerAveragedMoreLoss).toBe(false)
  })

  it('reports a weak strength when the two groups barely differ (#224)', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 89.5, calorieEntries: calories(1700) }), // delta -0.5
        entry(weekStart(2), { weightKg: 88.95, calorieEntries: calories(1800) }), // delta -0.55
        entry(weekStart(3), { weightKg: 88.43, calorieEntries: calories(2200) }), // delta -0.52
        entry(weekStart(4), { weightKg: 87.86, calorieEntries: calories(2300) }), // delta -0.57
      ],
      4,
    )

    const insight = correlationInsight(entries)
    // Both groups lose weight at nearly the same rate — a 0.02kg gap,
    // well under the 0.15kg "moderate" weekly threshold.
    expect(insight!.strength).toBe('weak')
  })

  it('rounds the threshold to the nearest 50 kcal', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1810) }),
        entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1830) }),
        entry(weekStart(3), { weightKg: 85, calorieEntries: calories(2210) }),
        entry(weekStart(4), { weightKg: 84, calorieEntries: calories(2230) }),
      ],
      4,
    )

    const insight = correlationInsight(entries)
    expect(insight!.thresholdKcal % 50).toBe(0)
  })

  it('excludes the current incomplete week from points (#522)', () => {
    // Week starts Saturday (matching the live firstEntryWeekday + period
    // filter that reproduced 727 = (1244+210)/2). Only Sat+Sun logged —
    // calendar week still runs through next Friday.
    const entries = [
      entry('2026-07-25', { weightKg: 80, calorieEntries: calories(2000) }),
      entry('2026-07-26', { weightKg: 79.8, calorieEntries: calories(1900) }),
      entry('2026-07-27', { weightKg: 79.5, calorieEntries: calories(2100) }),
      entry('2026-07-28', { weightKg: 79.3, calorieEntries: calories(1850) }),
      entry('2026-07-29', { weightKg: 79.1, calorieEntries: calories(1950) }),
      entry('2026-07-30', { weightKg: 79.0, calorieEntries: calories(1800) }),
      entry('2026-07-31', { weightKg: 78.8, calorieEntries: calories(1750) }),
      // Incomplete current week (Sat–Fri): only two days
      entry('2026-08-01', { weightKg: 78.7, calorieEntries: calories(1244) }),
      entry('2026-08-02', { weightKg: 78.9, calorieEntries: calories(210) }),
    ]

    const points = correlationInsightPoints(entries, 6, '2026-08-02')
    expect(points.map((p) => p.weekStart)).not.toContain('2026-08-01')
    expect(points.every((p) => p.calories !== 727)).toBe(true)
  })

  it('keeps a finished week even when only some of its days were logged (#522)', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }),
        entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }),
        entry(weekStart(3), { weightKg: 85.5, calorieEntries: calories(2200) }),
        // Only Monday of this week — still a finished calendar week once
        // the data window extends past its Sunday via withCompletedWindow.
        entry(weekStart(4), { weightKg: 85.3, calorieEntries: calories(2300) }),
      ],
      4,
    )

    const points = correlationInsightPoints(entries)
    expect(points.some((p) => p.weekStart === weekStart(4))).toBe(true)
  })
})
