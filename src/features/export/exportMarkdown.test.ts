import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { buildDailyLogMarkdown } from './exportMarkdown'

const t = getDictionary('en')

const DAILY_HEADER =
  '| Date | Weight (kg) | Calories (kcal) | Protein (g) | Fat (g) | Carbs (g) | ' +
  'Sleep (h) | Deep sleep (h) | Steps | Waist (cm) | Hip (cm) | Body fat (%) | ' +
  'Mood | Morning note | Note | On period | Constipation | Alcohol | Ate late tonight | Water (ml) | ' +
  'Muscle (kg) | Visceral fat | Body water (%) | Bone (kg) | Fiber (g) | ' +
  'Sodium (mg) | Potassium (mg) | Magnesium (mg) |'

const DAILY_SEPARATOR = `| ${Array.from({ length: 28 }, () => '---').join(' | ')} |`

const MEALS_HEADER =
  '| Date | Meal | Item | Brand | Calories (kcal) | Protein (g) | Fat (g) | Carbs (g) | ' +
  'Fiber (g) | Sodium (mg) | Potassium (mg) | Magnesium (mg) | Grams | Time | ' +
  'Reaction | Meal reaction | Why eating | Item note | Note |'

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

function dailyTable(markdown: string): string {
  return markdown.split('\n\n')[0] ?? markdown
}

describe('buildDailyLogMarkdown', () => {
  it('writes Daily Log and Meals header tables when there are no entries', () => {
    const markdown = buildDailyLogMarkdown([], t)
    const mealsSeparator = `| ${Array.from({ length: 19 }, () => '---').join(' | ')} |`

    expect(markdown).toBe(
      `${DAILY_HEADER}\n${DAILY_SEPARATOR}\n\n${MEALS_HEADER}\n${mealsSeparator}`,
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
    const [, , row] = dailyTable(markdown).split('\n')

    // #394 — nightEating is blank here (not false): the one logged meal has
    // no timeEaten, so hadNightEating() has no signal to derive from.
    expect(row).toBe(
      '| 2026-03-01 | 79.5 | 300 | 10 | 5 | 20 | 7h 0m | 1h 30m | 8000 | 80 | 95 | 22 | Happy |  | Felt good | true |  |  |  |  |  |  |  |  |  |  |  |  |',
    )
  })

  it('escapes an embedded pipe and collapses embedded newlines', () => {
    const entry = makeEntry({ note: 'Salad | with a newline\nhere' })
    const markdown = buildDailyLogMarkdown([entry], t)
    const [, , row] = dailyTable(markdown).split('\n')

    expect(row).toContain('Salad \\| with a newline here')
  })

  it('escapes backslashes before pipes (#706)', () => {
    const entry = makeEntry({ note: 'path\\to|file' })
    const markdown = buildDailyLogMarkdown([entry], t)
    const [, , row] = dailyTable(markdown).split('\n')

    expect(row).toContain('path\\\\to\\|file')
  })

  it('sorts entries by date ascending, regardless of input order', () => {
    const entries = [
      makeEntry({ id: 'e2', date: '2026-03-02', weightKg: 79 }),
      makeEntry({ id: 'e1', date: '2026-03-01', weightKg: 80 }),
    ]
    const markdown = buildDailyLogMarkdown(entries, t)
    const [, , row1, row2] = dailyTable(markdown).split('\n')

    expect(row1.startsWith('| 2026-03-01 | 80')).toBe(true)
    expect(row2.startsWith('| 2026-03-02 | 79')).toBe(true)
  })

  it('appends a Meals table after the Daily Log (#743)', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          label: 'Breakfast',
          items: [{ id: 'item-1', name: 'Toast', amountKcal: 150 }],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const markdown = buildDailyLogMarkdown([entry], t)
    const [, meals] = markdown.split('\n\n')
    const [, , row] = meals.split('\n')

    expect(meals.startsWith(MEALS_HEADER)).toBe(true)
    expect(row).toContain('| Breakfast | Toast |')
    expect(row).toContain('| 150 |')
    expect(row).toContain('| 08:00 |')
  })
})
