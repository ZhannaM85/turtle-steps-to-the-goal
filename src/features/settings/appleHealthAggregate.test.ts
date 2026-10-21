import { describe, expect, it } from 'vitest'
import {
  aggregateSleepByWakeDay,
  aggregateStepsByDay,
  aggregateWeightByDay,
  mapAggregatedStepBuckets,
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
        startDate: '2026-10-17T00:00:00.000Z',
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

  it('counts overlapping Watch stages and another app asleep block once (#1110)', () => {
    // 20–21 Oct: Watch stages 7h 4m (including 45m deep) sit inside an
    // 8h 54m asleep interval. Summing both was 15h 58m.
    const rows = aggregateSleepByWakeDay([
      {
        startDate: '2026-10-21T00:45:00.000Z',
        endDate: '2026-10-21T09:39:00.000Z',
        value: 534,
        sleepState: 'asleep',
      },
      {
        startDate: '2026-10-21T00:45:00.000Z',
        endDate: '2026-10-21T07:04:00.000Z',
        value: 379,
        sleepState: 'light',
      },
      {
        startDate: '2026-10-21T07:04:00.000Z',
        endDate: '2026-10-21T07:49:00.000Z',
        value: 45,
        sleepState: 'deep',
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.sleepHours).toBe(8.9)
    expect(rows[0]!.deepSleepHours).toBe(0.75)
  })

  it('still adds a nap that does not overlap the night', () => {
    const rows = aggregateSleepByWakeDay([
      {
        startDate: '2026-10-21T01:00:00.000Z',
        endDate: '2026-10-21T02:00:00.000Z',
        value: 60,
        sleepState: 'asleep',
      },
      {
        startDate: '2026-10-21T12:00:00.000Z',
        endDate: '2026-10-21T13:30:00.000Z',
        value: 90,
        sleepState: 'asleep',
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.sleepHours).toBe(2.5)
  })
})

describe('aggregateStepsByDay (#1104 / #1106)', () => {
  it('sums samples from the same source onto the local start day', () => {
    const rows = aggregateStepsByDay([
      {
        startDate: '2026-10-17T08:00:00.000Z',
        value: 3000,
        sourceId: 'watch',
      },
      {
        startDate: '2026-10-17T14:00:00.000Z',
        value: 2500.4,
        sourceId: 'watch',
      },
      {
        startDate: '2026-10-16T12:00:00.000Z',
        value: 1000,
        sourceId: 'watch',
      },
    ])
    expect(rows.find((r) => r.steps === 5500)).toBeDefined()
    expect(rows.find((r) => r.steps === 1000)).toBeDefined()
  })

  it('keeps the dominant source per day instead of summing phone + watch (#1106)', () => {
    const rows = aggregateStepsByDay([
      {
        startDate: '2026-10-18T08:00:00.000Z',
        value: 13967,
        sourceId: 'com.apple.health.watch',
      },
      {
        startDate: '2026-10-18T08:00:00.000Z',
        value: 14533,
        sourceId: 'com.apple.health.phone',
      },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.steps).toBe(14533)
  })
})

describe('mapAggregatedStepBuckets (#1106)', () => {
  it('maps Capgo day buckets onto local dates', () => {
    expect(
      mapAggregatedStepBuckets([
        { startDate: '2026-10-18T00:00:00.000Z', value: 13967.2 },
      ]),
    ).toEqual([{ date: expect.any(String), steps: 13967 }])
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
