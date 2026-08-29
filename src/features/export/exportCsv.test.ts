import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { getDictionary } from '@/i18n'
import type { AnalysisExportTrackingGate } from './dailyLogExport'
import { buildDailyLogCsv } from './exportCsv'

const t = getDictionary('en')

const DAILY_HEADER =
  'Date,Weight (kg),Calories (kcal),Protein (g),Fat (g),Carbs (g),' +
  'Sleep (h),Deep sleep (h),Steps,Waist (cm),Hip (cm),Body fat (%),' +
  'Mood,Morning note,Note,On period,Constipation,Alcohol,Ate late tonight,Water (ml),' +
  'Muscle (kg),Visceral fat,Body water (%),Bone (kg),Fiber (g),' +
  'Sodium (mg),Potassium (mg),Magnesium (mg)'

const MEALS_HEADER =
  'Date,Meal,Item,Brand,Calories (kcal),Protein (g),Fat (g),Carbs (g),' +
  'Fiber (g),Sodium (mg),Potassium (mg),Magnesium (mg),Grams,Time,' +
  'Reaction,Meal reaction,Why eating,Item note,Note'

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

const ALL_TRACKED: AnalysisExportTrackingGate = {
  sleep: true,
  steps: true,
  bodyMeasurements: true,
  note: true,
  morningNote: true,
  mood: true,
  bodyComposition: true,
  nightEating: true,
  fiber: true,
  cycle: true,
  digestion: true,
  alcohol: true,
  water: true,
  sodium: true,
  potassium: true,
  magnesium: true,
  eatingReason: true,
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
      '2026-03-01,79.5,300,10,5,20,7h 0m,1h 30m,8000,80,95,22,Happy,,Felt good,true,,,,,,,,,,,,',
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
      '2026-03-01,Breakfast,Toast,,150,,,,2,200,,,60,08:00,Thumbs up,Happy,,Crispy,Meal note',
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

  it('omits a Daily Log column when its Settings gate is off, even if days have values (#744)', () => {
    const entry = makeEntry({ hadAlcohol: true, sleepHours: 7 })
    const csv = buildDailyLogCsv([entry], t, undefined, {
      tracking: { ...ALL_TRACKED, alcohol: false },
    })
    const [header, row] = dailyTable(csv).split('\r\n')

    expect(header).toContain('Sleep (h)')
    expect(header).not.toContain('Alcohol')
    expect(row.split(',')[header.split(',').indexOf('Sleep (h)')]).toBe(
      '7h 0m',
    )
  })

  it('writes sleep and deep sleep as hours and minutes, not decimal hours (#751)', () => {
    const entry = makeEntry({ sleepHours: 10.55, deepSleepHours: 3.43 })
    const csv = buildDailyLogCsv([entry], t)
    const [header, row] = dailyTable(csv).split('\r\n')
    const cells = row.split(',')

    expect(cells[header.split(',').indexOf('Sleep (h)')]).toBe('10h 33m')
    expect(cells[header.split(',').indexOf('Deep sleep (h)')]).toBe('3h 26m')
  })

  it('uses locale sleep units in CSV (#751)', () => {
    const csv = buildDailyLogCsv(
      [makeEntry({ sleepHours: 10.55 })],
      getDictionary('ru'),
    )
    const [header, row] = dailyTable(csv).split('\r\n')

    expect(row.split(',')[header.split(',').indexOf('Сон (ч)')]).toBe(
      '10ч 33м',
    )
  })

  it('keeps a tracked column when some days are blank (#744)', () => {
    const csv = buildDailyLogCsv([makeEntry()], t, undefined, {
      tracking: ALL_TRACKED,
    })
    const [header] = dailyTable(csv).split('\r\n')

    expect(header).toContain('Sleep (h)')
    expect(header).toContain('Alcohol')
    expect(header).toContain('Water (ml)')
  })

  it('omits meal fiber and electrolyte columns when those gates are off (#744)', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          label: 'Breakfast',
          items: [
            {
              id: 'item-1',
              name: 'Toast',
              amountKcal: 150,
              fiberG: 2,
              sodiumMg: 200,
            },
          ],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const csv = buildDailyLogCsv([entry], t, undefined, {
      tracking: {
        ...ALL_TRACKED,
        fiber: false,
        sodium: false,
        potassium: false,
        magnesium: false,
      },
    })
    const [, meals] = csv.split('\r\n\r\n')
    const [header, row] = meals.split('\r\n')

    expect(header).toContain('Meal')
    expect(header).toContain('Item')
    expect(header).toContain('Calories (kcal)')
    expect(header).not.toContain('Fiber (g)')
    expect(header).not.toContain('Sodium (mg)')
    expect(row).toContain('Breakfast,Toast,,150')
  })

  it('exports why-eating on the Meals sheet and omits the column when tracking is off (#764)', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          label: 'Breakfast',
          eatingReason: 'hunger',
          items: [{ id: 'item-1', name: 'Toast', amountKcal: 150 }],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const withColumn = buildDailyLogCsv([entry], t)
    const [, mealsWith] = withColumn.split('\r\n\r\n')
    const [headerWith, rowWith] = mealsWith.split('\r\n')

    expect(headerWith).toContain('Why eating')
    expect(
      rowWith.split(',')[headerWith.split(',').indexOf('Why eating')],
    ).toBe('Hunger')

    const withoutColumn = buildDailyLogCsv([entry], t, undefined, {
      tracking: { ...ALL_TRACKED, eatingReason: false },
    })
    const [, mealsWithout] = withoutColumn.split('\r\n\r\n')
    const [headerWithout] = mealsWithout.split('\r\n')

    expect(headerWithout).not.toContain('Why eating')
  })

  it('exports a custom eating reason as the saved text (#765)', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          label: 'Breakfast',
          eatingReason: 'Tired after work',
          items: [{ id: 'item-1', name: 'Toast', amountKcal: 150 }],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const csv = buildDailyLogCsv([entry], t)
    const [, meals] = csv.split('\r\n\r\n')
    const [header, row] = meals.split('\r\n')

    expect(
      row.split(',')[header.split(',').indexOf('Why eating')],
    ).toBe('Tired after work')
  })

  it('exports an edited built-in eating reason label (#766)', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          label: 'Breakfast',
          eatingReason: 'hunger',
          items: [{ id: 'item-1', name: 'Toast', amountKcal: 150 }],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const csv = buildDailyLogCsv([entry], t, undefined, {
      eatingReasonLabelOverrides: { hunger: 'Stomach growl' },
    })
    const [, meals] = csv.split('\r\n\r\n')
    const [header, row] = meals.split('\r\n')

    expect(
      row.split(',')[header.split(',').indexOf('Why eating')],
    ).toBe('Stomach growl')
  })

  it('exports several why-eating reasons as one quoted cell (#774)', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'meal-1',
          label: 'Breakfast',
          eatingReason: 'hunger',
          eatingReasons: ['hunger', 'lonely'],
          items: [{ id: 'item-1', name: 'Toast', amountKcal: 150 }],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })
    const csv = buildDailyLogCsv([entry], t)
    const [, meals] = csv.split('\r\n\r\n')
    const row = meals.split('\r\n')[1]

    expect(row).toContain('"Hunger, Lonely"')
  })

  it('fills meal Time from the Breakfast slot default when timeEaten is missing (#754)', () => {
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
    const csv = buildDailyLogCsv([entry], t)
    const [, meals] = csv.split('\r\n\r\n')
    const [header, row] = meals.split('\r\n')

    expect(row.split(',')[header.split(',').indexOf('Time')]).toBe('08:00')
  })

  it('uses remembered slot clocks for meal Time when passed (#754)', () => {
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
    const csv = buildDailyLogCsv([entry], t, undefined, {
      mealSlotTimes: {
        breakfast: '09:15',
        lunch: '13:00',
        dinner: '19:00',
        snack: '16:00',
      },
    })
    const [, meals] = csv.split('\r\n\r\n')
    const [header, row] = meals.split('\r\n')

    expect(row.split(',')[header.split(',').indexOf('Time')]).toBe('09:15')
  })
})
