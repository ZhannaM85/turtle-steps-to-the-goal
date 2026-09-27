import { describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { restampDiaryLdl } from './restampDiaryLdl'

function item(
  id: string,
  name: string,
  extra: Partial<CalorieItem> = {},
): CalorieItem {
  return { id, name, amountKcal: 104, proteinG: 1, fatG: 0, carbsG: 28, amountG: 200, ...extra }
}

function day(date: string, items: CalorieItem[]): DailyEntry {
  return {
    id: `day-${date}`,
    date,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    calorieEntries: [
      {
        id: `meal-${date}`,
        createdAt: `${date}T08:00:00.000Z`,
        items,
      },
    ],
  }
}

const apple = {
  names: ['Яблоко', 'Apple', 'яблоки', 'apples'],
  cholesterolImpact: 'beneficial' as const,
  cholesterolReason: 'Пектин.',
}

describe('restampDiaryLdl (#1020)', () => {
  it('restamps matching diary rows, including an older day, and leaves macros', () => {
    const older = day('2026-09-01', [
      item('apple-old', 'Яблоко', { cholesterolImpact: 'unknown' }),
    ])
    const today = day('2026-09-26', [
      item('apple', '  Яблоко  ', { cholesterolImpact: 'unknown' }),
      item('orange', 'Апельсин', {
        amountKcal: 47,
        cholesterolImpact: 'unknown',
      }),
    ])

    const result = restampDiaryLdl([older, today], [apple])

    expect(result.updatedItemCount).toBe(2)
    expect(result.entriesToUpsert).toHaveLength(2)
    const stamped = result.entriesToUpsert
      .flatMap((entry) => entry.calorieEntries ?? [])
      .flatMap((meal) => meal.items)
    expect(stamped.find((row) => row.id === 'apple')).toMatchObject({
      name: '  Яблоко  ',
      amountKcal: 104,
      proteinG: 1,
      fatG: 0,
      carbsG: 28,
      amountG: 200,
      cholesterolImpact: 'beneficial',
      cholesterolReason: 'Пектин.',
    })
    expect(stamped.find((row) => row.id === 'orange')).toMatchObject({
      name: 'Апельсин',
      amountKcal: 47,
      cholesterolImpact: 'unknown',
    })
    expect(stamped.find((row) => row.id === 'apple-old')?.cholesterolImpact).toBe(
      'beneficial',
    )
  })

  it('matches an English name and a paste alias', () => {
    const entries = [
      day('2026-09-26', [
        item('en', 'Apple', { cholesterolImpact: 'unknown' }),
        item('alias', 'яблоки', { cholesterolImpact: 'unknown' }),
      ]),
    ]
    const result = restampDiaryLdl(entries, [apple])
    expect(result.updatedItemCount).toBe(2)
    for (const row of result.entriesToUpsert[0]?.calorieEntries?.[0]?.items ?? []) {
      expect(row.cholesterolImpact).toBe('beneficial')
    }
  })

  it('skips a row whose LDL is already the catalog value', () => {
    const entries = [
      day('2026-09-26', [
        item('apple', 'Яблоко', {
          cholesterolImpact: 'beneficial',
          cholesterolReason: 'Пектин.',
        }),
      ]),
    ]
    expect(restampDiaryLdl(entries, [apple])).toEqual({
      entriesToUpsert: [],
      updatedItemCount: 0,
    })
  })

  it('does not apply a name claimed by two different LDL values', () => {
    const entries = [
      day('2026-09-26', [
        item('apple', 'Яблоко', { cholesterolImpact: 'unknown' }),
      ]),
    ]
    const result = restampDiaryLdl(entries, [
      apple,
      {
        names: ['Яблоко'],
        cholesterolImpact: 'limit',
        cholesterolReason: 'Другое.',
      },
    ])
    expect(result.updatedItemCount).toBe(0)
    expect(result.entriesToUpsert).toEqual([])
  })
})
