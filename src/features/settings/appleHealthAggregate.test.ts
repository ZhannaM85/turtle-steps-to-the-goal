import { describe, expect, it } from 'vitest'
import {
  aggregateSleepByWakeDay,
  aggregateStepsByDay,
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

describe('aggregateStepsByDay (#1104)', () => {
  it('sums step samples onto the local start day', () => {
    const rows = aggregateStepsByDay([
      { startDate: '2026-10-17T08:00:00.000Z', value: 3000 },
      { startDate: '2026-10-17T14:00:00.000Z', value: 2500.4 },
      { startDate: '2026-10-16T12:00:00.000Z', value: 1000 },
    ])
    expect(rows).toEqual(
      expect.arrayContaining([
        { date: expect.any(String), steps: 5500 },
        { date: expect.any(String), steps: 1000 },
      ]),
    )
    expect(rows.find((r) => r.steps === 5500)).toBeDefined()
  })
})

describe('mergeAppleHealthDayReadings', () => {
  it('merges weight, sleep, and steps on the same date', () => {
    expect(
      mergeAppleHealthDayReadings({
        weights: [{ date: '2026-10-17', weightKg: 66.5 }],
        sleep: [{ date: '2026-10-17', sleepHours: 7.5, deepSleepHours: 2 }],
        steps: [{ date: '2026-10-17', steps: 8400 }],
      }),
    ).toEqual([
      {
        date: '2026-10-17',
        weightKg: 66.5,
        sleepHours: 7.5,
        deepSleepHours: 2,
        steps: 8400,
      },
    ])
  })

  it('marks period days from HealthKit menstrual flow (#1099)', () => {
    expect(
      mergeAppleHealthDayReadings({
        weights: [{ date: '2026-10-17', weightKg: 66.5 }],
        periodDates: ['2026-10-16', '2026-10-17'],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-10-17', weightKg: 66.5, onPeriod: true }),
        expect.objectContaining({ date: '2026-10-16', onPeriod: true }),
      ]),
    )
  })
})
