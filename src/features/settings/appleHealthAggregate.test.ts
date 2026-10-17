import { describe, expect, it } from 'vitest'
import {
  aggregateSleepByWakeDay,
  aggregateWeightByDay,
  mergeAppleHealthDayReadings,
} from './appleHealthAggregate'

describe('aggregateWeightByDay', () => {
  it('keeps the first (newest) sample per local day', () => {
    const rows = aggregateWeightByDay([
      { startDate: '2026-10-17T12:00:00.000Z', value: 66.5 },
      { startDate: '2026-10-17T11:00:00.000Z', value: 66.8 },
      { startDate: '2026-10-16T12:00:00.000Z', value: 67.0 },
    ])
    expect(rows.map((r) => r.weightKg)).toEqual([66.5, 67.0])
    expect(new Set(rows.map((r) => r.date)).size).toBe(2)
  })
})

describe('aggregateSleepByWakeDay', () => {
  it('sums asleep stages onto the wake (end) day and tracks deep separately', () => {
    const rows = aggregateSleepByWakeDay([
      {
        startDate: '2026-10-16T22:00:00.000Z',
        endDate: '2026-10-17T02:00:00.000Z',
        value: 120,
        sleepState: 'light',
      },
      {
        startDate: '2026-10-17T02:00:00.000Z',
        endDate: '2026-10-17T05:00:00.000Z',
        value: 180,
        sleepState: 'deep',
      },
      {
        startDate: '2026-10-17T05:00:00.000Z',
        endDate: '2026-10-17T06:00:00.000Z',
        value: 60,
        sleepState: 'awake',
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.sleepHours).toBe(5)
    expect(rows[0]!.deepSleepHours).toBe(3)
  })
})

describe('mergeAppleHealthDayReadings', () => {
  it('merges weight and sleep on the same date', () => {
    expect(
      mergeAppleHealthDayReadings(
        [{ date: '2026-10-17', weightKg: 66.5 }],
        [{ date: '2026-10-17', sleepHours: 7.5, deepSleepHours: 2 }],
      ),
    ).toEqual([
      {
        date: '2026-10-17',
        weightKg: 66.5,
        sleepHours: 7.5,
        deepSleepHours: 2,
      },
    ])
  })

  it('marks period days from HealthKit menstrual flow (#1099)', () => {
    expect(
      mergeAppleHealthDayReadings(
        [{ date: '2026-10-17', weightKg: 66.5 }],
        [],
        ['2026-10-16', '2026-10-17'],
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-10-17', weightKg: 66.5, onPeriod: true }),
        expect.objectContaining({ date: '2026-10-16', onPeriod: true }),
      ]),
    )
  })
})
