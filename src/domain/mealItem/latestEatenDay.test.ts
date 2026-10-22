import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { latestEatenDayByNormalizedName } from './latestEatenDay'

function day(
  date: string,
  names: Array<string | undefined>,
): DailyEntry {
  return {
    id: date,
    date,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
    calorieEntries: [
      {
        id: `meal-${date}`,
        createdAt: `${date}T12:00:00.000Z`,
        items: names.map((name, index) => ({
          id: `item-${date}-${index}`,
          name,
          amountKcal: 100,
        })),
      },
    ],
  }
}

describe('latestEatenDayByNormalizedName (#1111)', () => {
  it('keeps the latest diary day for a food, ignoring spacing and case', () => {
    const latest = latestEatenDayByNormalizedName([
      day('2026-01-02', ['Cookies']),
      day('2026-03-15', ['  cookies  ']),
      day('2026-02-01', ['Cookies']),
    ])
    expect(latest.get('cookies')).toBe('2026-03-15')
  })

  it('tracks each food on its own and skips blank names', () => {
    const latest = latestEatenDayByNormalizedName([
      day('2026-04-01', ['Pizza', undefined, '  ']),
      day('2026-04-02', ['Salad']),
    ])
    expect(latest.get('pizza')).toBe('2026-04-01')
    expect(latest.get('salad')).toBe('2026-04-02')
    expect(latest.size).toBe(2)
  })

  it('counts a named food even when the portion is 0 kcal', () => {
    const entry = day('2026-05-01', ['Tea'])
    entry.calorieEntries![0].items[0].amountKcal = 0
    const latest = latestEatenDayByNormalizedName([entry])
    expect(latest.get('tea')).toBe('2026-05-01')
  })
})
