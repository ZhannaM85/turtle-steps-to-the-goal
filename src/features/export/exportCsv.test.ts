import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import { buildDailyLogCsv } from './exportCsv'

const t = getDictionary('en')

const DAILY_HEADER =
  'Date,Weight (kg),Calories (kcal),Protein (g),Fat (g),Carbs (g),' +
  'Sleep (h),Deep sleep (h),Steps,Waist (cm),Hip (cm),Body fat (%),' +
  'Mood,Note,On period,Constipation,Alcohol,Ate late tonight,Water (ml),' +
  'Muscle (kg),Visceral fat,Body water (%),Bone (kg),Fiber (g),' +
  'Sodium (mg),Potassium (mg),Magnesium (mg)'

const MEALS_HEADER =
  'Date,Meal,Item,Brand,Calories (kcal),Protein (g),Fat (g),Carbs (g),' +
  'Fiber (g),Sodium (mg),Potassium (mg),Magnesium (mg),Grams,Time,' +
  'Reaction,Meal reaction,Item note,Note'

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

function dailyTable(csv: string): string {
  return csv.split('\r\n\r\n')[0] ?? csv
}

describe('buildDailyLogCsv', () => {
  it('writes the Daily Log header and a Meals header when there are no entries', () => {
    const csv = buildDailyLogCsv([], t)

    expect(csv).toBe(`${DAILY_HEADER}\r\n\r\n${MEALS_HEADER}`)
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
    const csv = buildDailyLogCsv([entry], t)
    const [, row] = dailyTable(csv).split('\r\n')

    // #394 — nightEating is blank here (not false): the one logged meal has
    // no timeEaten, so hadNightEating() has no signal to derive from.
    expect(row).toBe(
      '2026-03-01,79.5,300,10,5,20,7,1.5,8000,80,95,22,Happy,Felt good,true,,,,,,,,,,,,',
    )
  })

  it('exports the effective night-eating value, derived from a late meal with no override (#383)', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          items: [{ id: 'item-1', amountKcal: 400 }],
          timeEaten: '23:00',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const csv = buildDailyLogCsv([entry], t)
    const [header, row] = dailyTable(csv).split('\r\n')
    const nightEatingIndex = header.split(',').indexOf('Ate late tonight')

    expect(row.split(',')[nightEatingIndex]).toBe('true')
  })

  it('quotes fields containing a comma and escapes embedded quotes', () => {
    const entry = makeEntry({ note: 'Salad, with "extra" dressing' })
    const csv = buildDailyLogCsv([entry], t)
    const [, row] = dailyTable(csv).split('\r\n')

    expect(row).toContain('"Salad, with ""extra"" dressing"')
  })

  it('uses the gender-correct night-eating column header when sex is given (#414)', () => {
    const ru = getDictionary('ru')
    const csv = buildDailyLogCsv([], ru, 'female')
    const [header] = dailyTable(csv).split('\r\n')

    expect(header).toContain('Ела поздно вечером')
    expect(header).not.toContain('Ел(а)')
  })

  it('sorts entries by date ascending, regardless of input order', () => {
    const entries = [
      makeEntry({ id: 'e2', date: '2026-03-02', weightKg: 79 }),
      makeEntry({ id: 'e1', date: '2026-03-01', weightKg: 80 }),
    ]
    const csv = buildDailyLogCsv(entries, t)
    const [, row1, row2] = dailyTable(csv).split('\r\n')

    expect(row1.startsWith('2026-03-01,80')).toBe(true)
    expect(row2.startsWith('2026-03-02,79')).toBe(true)
  })

  it('appends a Meals table with fiber, electrolytes, meal reaction, and item note (#743)', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          label: 'Breakfast',
          timeEaten: '08:00',
          note: 'Meal note',
          reaction: 'happy',
          items: [
            {
              id: 'item-1',
              name: 'Toast',
              amountKcal: 150,
              amountG: 60,
              fiberG: 2,
              sodiumMg: 200,
              emotion: 'thumbsUp',
              noteText: 'Crispy',
            },
          ],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const csv = buildDailyLogCsv([entry], t)
    const [, meals] = csv.split('\r\n\r\n')
    const [header, row] = meals.split('\r\n')

    expect(header).toBe(MEALS_HEADER)
    expect(row).toBe(
      '2026-03-01,Breakfast,Toast,,150,,,,2,200,,,60,08:00,Thumbs up,Happy,Crispy,Meal note',
    )
  })

  it('adds one Daily Log column per custom metric (#743)', () => {
    const csv = buildDailyLogCsv([makeEntry()], t, undefined, {
      customMetrics: [
        {
          id: 'm-acne',
          name: 'Acne',
          inputKind: 'scale5',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'm-reps',
          name: 'Reps',
          inputKind: 'number',
          unit: 'reps',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      customMetricEntries: [
        {
          id: 'e-acne',
          metricId: 'm-acne',
          date: '2026-03-01',
          value: 3,
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const [header, row] = dailyTable(csv).split('\r\n')

    expect(header.endsWith(',Acne,Reps (reps)')).toBe(true)
    expect(row.endsWith(',3,')).toBe(true)
  })
})
