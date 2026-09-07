import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import {
  eatingEpisodeLinks,
  eatingPatternInsights,
} from './eatingPatterns'

function meal(
  id: string,
  timeEaten: string,
  kcal: number,
  carbsG?: number,
  eatingReason?: CalorieEntry['eatingReason'],
): CalorieEntry {
  return {
    id,
    items: [
      {
        id: `${id}-i`,
        amountKcal: kcal,
        ...(carbsG !== undefined ? { carbsG } : {}),
      },
    ],
    timeEaten,
    createdAt: '2026-03-01T00:00:00.000Z',
    eatingReason,
  }
}

function entry(
  date: string,
  calorieEntries: CalorieEntry[],
): DailyEntry {
  return {
    id: date,
    date,
    calorieEntries,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }
}

describe('eatingPatterns (#823)', () => {
  it('measures time until the next eating episode, not invented hunger', () => {
    const links = eatingEpisodeLinks([
      entry('2026-03-01', [
        meal('lunch', '13:00', 500, 40),
        meal('chocolate', '14:30', 200, 30, 'craving'),
        meal('dinner', '18:30', 600, 50, 'hunger'),
      ]),
    ])

    expect(links).toHaveLength(2)
    expect(links[0]?.minutesToNext).toBe(90)
    expect(links[0]?.nextReasons).toEqual(['craving'])
    expect(links[1]?.minutesToNext).toBe(240)
  })

  it('returns no insights when there are too few consecutive meals', () => {
    expect(
      eatingPatternInsights(
        eatingEpisodeLinks([
          entry('2026-03-01', [meal('a', '13:00', 400, 80)]),
        ]),
      ),
    ).toEqual([])
  })

  it('surfaces a carb-gap insight when higher-carb meals are followed sooner', () => {
    const days: DailyEntry[] = []
    for (let i = 1; i <= 8; i++) {
      const day = String(i).padStart(2, '0')
      days.push(
        entry(`2026-03-${day}`, [
          meal(`hi-${i}`, '08:00', 400, 80),
          meal(`next-hi-${i}`, '10:00', 200),
        ]),
      )
    }
    for (let i = 9; i <= 16; i++) {
      const day = String(i).padStart(2, '0')
      days.push(
        entry(`2026-03-${day}`, [
          meal(`lo-${i}`, '08:00', 400, 10),
          meal(`next-lo-${i}`, '12:00', 200),
        ]),
      )
    }

    const insights = eatingPatternInsights(eatingEpisodeLinks(days))
    const carb = insights.find((insight) => insight.kind === 'carbGap')

    expect(carb?.kind).toBe('carbGap')
    if (carb?.kind !== 'carbGap') return
    expect(carb.higherCarbMinutes).toBe(120)
    expect(carb.lowerCarbMinutes).toBe(240)
    expect(carb.sampleSize).toBeGreaterThanOrEqual(8)
  })

  it('surfaces evening meals that are often followed by night eating', () => {
    const days: DailyEntry[] = []
    for (let i = 1; i <= 8; i++) {
      const day = String(i).padStart(2, '0')
      days.push(
        entry(`2026-03-${day}`, [
          meal(`eve-${i}`, '19:00', 600, 50, 'hunger'),
          meal(`night-${i}`, '23:30', 250, 40, 'craving'),
        ]),
      )
    }

    const insights = eatingPatternInsights(eatingEpisodeLinks(days))
    const evening = insights.find((insight) => insight.kind === 'eveningToNight')

    expect(evening?.kind).toBe('eveningToNight')
    if (evening?.kind !== 'eveningToNight') return
    expect(evening.eveningThenNightCount).toBe(8)
    expect(evening.averageMinutes).toBe(270)
    expect(evening.topNextReason).toBe('craving')
  })
})
