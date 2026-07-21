import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { buildDailyLogMarkdown } from './exportMarkdown'

const t = getDictionary('en')

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('buildDailyLogMarkdown', () => {
  it('writes just the header + separator rows when there are no entries', () => {
    const markdown = buildDailyLogMarkdown([], t)

    expect(markdown).toBe(
      '| Date | Weight (kg) | Calories (kcal) | Protein (g) | Fat (g) | Carbs (g) | ' +
        'Sleep (h) | Deep sleep (h) | Steps | Waist (cm) | Hip (cm) | Body fat (%) | ' +
        'Mood | Note | On period | Constipation |\n' +
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    )
  })

  it('writes one row per entry with totals computed across meals', () => {
    const entry = makeEntry({
      weightKg: 79.5,
      sleepHours: 7,
      deepSleepHours: 1.5,
      steps: 8000,
      waistCm: 80,
      hipCm: 95,
      bodyFatPercent: 22,
      note: 'Felt good',
      emotion: 'happy',
      onPeriod: true,
      calorieEntries: [
        {
          id: 'meal-1',
          items: [
            { id: 'item-1', amountKcal: 200, proteinG: 10, fatG: 5 },
            { id: 'item-2', amountKcal: 100, carbsG: 20 },
          ],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const markdown = buildDailyLogMarkdown([entry], t)
    const [, , row] = markdown.split('\n')

    expect(row).toBe(
      '| 2026-03-01 | 79.5 | 300 | 10 | 5 | 20 | 7 | 1.5 | 8000 | 80 | 95 | 22 | Happy | Felt good | true |  |',
    )
  })

  it('escapes an embedded pipe and collapses embedded newlines', () => {
    const entry = makeEntry({ note: 'Salad | with a newline\nhere' })
    const markdown = buildDailyLogMarkdown([entry], t)
    const [, , row] = markdown.split('\n')

    expect(row).toContain('Salad \\| with a newline here')
  })

  it('sorts entries by date ascending, regardless of input order', () => {
    const entries = [
      makeEntry({ id: 'e2', date: '2026-03-02', weightKg: 79 }),
      makeEntry({ id: 'e1', date: '2026-03-01', weightKg: 80 }),
    ]
    const markdown = buildDailyLogMarkdown(entries, t)
    const [, , row1, row2] = markdown.split('\n')

    expect(row1.startsWith('| 2026-03-01 | 80')).toBe(true)
    expect(row2.startsWith('| 2026-03-02 | 79')).toBe(true)
  })
})
