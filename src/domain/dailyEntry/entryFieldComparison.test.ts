import { describe, expect, it } from 'vitest'
import type { DailyEntry } from './DailyEntry'
import {
  comparisonDirection,
  comparisonTone,
  exactlyDaysBefore,
  findFieldValueOnDate,
  findMostRecentPriorFieldValue,
} from './entryFieldComparison'

function entry(
  date: string,
  fields: Partial<
    Pick<
      DailyEntry,
      | 'weightKg'
      | 'steps'
      | 'sleepHours'
      | 'muscleMassKg'
      | 'visceralFatRating'
      | 'bodyWaterPercent'
      | 'boneMassKg'
      | 'bodyFatPercent'
    >
  >,
): DailyEntry {
  return {
    id: date,
    date,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...fields,
  }
}

describe('entryFieldComparison (#664)', () => {
  describe('findMostRecentPriorFieldValue', () => {
    it('returns yesterday when that day has the field', () => {
      const result = findMostRecentPriorFieldValue(
        [entry('2026-08-08', { weightKg: 70 }), entry('2026-08-09', { weightKg: 69 })],
        'weightKg',
        '2026-08-09',
      )
      expect(result).toEqual({
        date: '2026-08-08',
        value: 70,
        isYesterday: true,
      })
    })

    it('falls back to the most recent prior day that has the field', () => {
      const result = findMostRecentPriorFieldValue(
        [
          entry('2026-08-05', { weightKg: 71 }),
          entry('2026-08-07', { steps: 5000 }),
          entry('2026-08-09', { weightKg: 69 }),
        ],
        'weightKg',
        '2026-08-09',
      )
      expect(result).toEqual({
        date: '2026-08-05',
        value: 71,
        isYesterday: false,
      })
    })

    it('returns null when no prior entry has the field', () => {
      expect(
        findMostRecentPriorFieldValue(
          [entry('2026-08-09', { weightKg: 69 })],
          'weightKg',
          '2026-08-09',
        ),
      ).toBeNull()
    })
  })

  describe('findFieldValueOnDate / exactlyDaysBefore', () => {
    it('reads the value from exactly that date only', () => {
      const entries = [
        entry('2026-07-10', { steps: 1000 }),
        entry('2026-07-11', { steps: 2000 }),
      ]
      expect(exactlyDaysBefore('2026-08-09', 30)).toBe('2026-07-10')
      expect(findFieldValueOnDate(entries, 'steps', '2026-07-10')).toBe(1000)
      expect(findFieldValueOnDate(entries, 'steps', '2026-07-09')).toBeUndefined()
    })
  })

  describe('comparisonTone / comparisonDirection', () => {
    it('marks weight decrease as good and increase as bad', () => {
      expect(comparisonTone(69, 70, 'lowerIsBetter')).toBe('good')
      expect(comparisonTone(71, 70, 'lowerIsBetter')).toBe('bad')
      expect(comparisonDirection(69, 70)).toBe('down')
      expect(comparisonDirection(71, 70)).toBe('up')
    })

    it('marks steps increase as good and decrease as bad', () => {
      expect(comparisonTone(9000, 8000, 'higherIsBetter')).toBe('good')
      expect(comparisonTone(7000, 8000, 'higherIsBetter')).toBe('bad')
    })

    it('returns null when values are equal', () => {
      expect(comparisonTone(70, 70, 'lowerIsBetter')).toBeNull()
      expect(comparisonDirection(70, 70)).toBeNull()
    })
  })
})
