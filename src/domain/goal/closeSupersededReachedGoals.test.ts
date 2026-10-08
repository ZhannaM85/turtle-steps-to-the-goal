import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { closeSupersededReachedGoals } from './closeSupersededReachedGoals'
import { goalWindowProgress } from './goalWindowProgress'

const previous: Goal = {
  id: 'previous', weekStart: '2026-09-28', weekEnd: '2026-10-04',
  targetWeeklyLossKg: 0.1, baselineWeightKg: 60.15,
  createdAt: '2026-09-28T08:00:00Z', updatedAt: '2026-09-28T08:00:00Z',
}
const next: Goal = {
  ...previous, id: 'next', weekStart: '2026-10-03', weekEnd: '2026-10-11',
  baselineWeightKg: 60, createdAt: '2026-10-03T08:00:00Z', updatedAt: '2026-10-03T08:00:00Z',
}
const weighIn = (date: string, weightKg: number): DailyEntry => ({
  id: date, date, weightKg, createdAt: `${date}T07:00:00Z`, updatedAt: `${date}T07:00:00Z`,
})
const entries = [weighIn('2026-09-28', 60.15), weighIn('2026-10-03', 60), weighIn('2026-10-04', 60.6)]

describe('closeSupersededReachedGoals (#1090)', () => {
  it('reproduces October 3 success lost to October 4 and closes only the previous goal', () => {
    expect(goalWindowProgress(entries, previous)?.finalTargetMet).toBe(false)
    const [closed] = closeSupersededReachedGoals([next, previous], entries)
    expect(closed).toMatchObject({ id: 'previous', weekEnd: '2026-10-03', baselineWeightKg: 60.15 })
    expect(goalWindowProgress(entries, closed)).toMatchObject({
      finalTargetMet: true, metOnDate: '2026-10-03', currentWeightDate: '2026-10-03', currentWeightKg: 60,
    })
    expect(previous.weekEnd).toBe('2026-10-04')
    expect(closeSupersededReachedGoals([closed, next], entries)).toEqual([])
  })

  it.each(['2026-10-03', '2026-10-04', '2026-10-11', undefined])(
    'handles a short, default or longer period with end %s', (weekEnd) => {
      const goal = { ...previous, weekStart: '2026-10-01', weekEnd }
      const successor = { ...next, weekStart: '2026-10-02' }
      const weights = [weighIn('2026-10-01', 60.15), weighIn('2026-10-02', 60), weighIn('2026-10-03', 60.6)]
      expect(closeSupersededReachedGoals([goal, successor], weights)[0]?.weekEnd).toBe('2026-10-02')
    },
  )

  it('keeps the frozen baseline when the start-day weight differs (#676)', () => {
    const weights = [weighIn('2026-09-28', 60.19), ...entries.slice(1)]
    const [closed] = closeSupersededReachedGoals([previous, next], weights)
    expect(closed.baselineWeightKg).toBe(60.15)
    expect(goalWindowProgress(weights, closed)?.finalTargetMet).toBe(true)
  })

  it('accepts an exact-threshold reach', () => {
    const goal = { ...previous, baselineWeightKg: 60.1 }
    expect(closeSupersededReachedGoals([goal, next], entries)[0]?.weekEnd).toBe('2026-10-03')
  })

  it('does not turn an ordinary early crossing and later regression into permanent success', () => {
    expect(closeSupersededReachedGoals([previous], entries)).toEqual([])
    expect(closeSupersededReachedGoals([previous, { ...next, weekStart: '2026-10-05' }], entries)).toEqual([])
    expect(goalWindowProgress(entries, previous)?.finalTargetMet).toBe(false)
  })

  it('does not infer a closure from a missing/non-qualifying boundary weigh-in', () => {
    expect(closeSupersededReachedGoals([previous, next], [entries[0], entries[2]])).toEqual([])
    expect(closeSupersededReachedGoals([previous, next], [entries[0], weighIn('2026-10-03', 60.2)])).toEqual([])
  })

  it('requires the immediate successor to start on the first reach day', () => {
    const intermediate = { ...next, id: 'intermediate', weekStart: '2026-10-02', createdAt: '2026-10-02T08:00:00Z' }
    expect(closeSupersededReachedGoals([previous, intermediate, next], entries)).toEqual([])
    expect(closeSupersededReachedGoals([previous, next], [...entries, weighIn('2026-10-01', 60)])).toEqual([])
  })

  it('leaves already-concluded and last-day restarts alone', () => {
    expect(closeSupersededReachedGoals([{ ...previous, weekEnd: '2026-10-03' }, next], entries)).toEqual([])
    expect(closeSupersededReachedGoals([previous, { ...next, weekStart: '2026-10-04' }], entries)).toEqual([])
  })
})
