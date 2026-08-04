import { describe, expect, it } from 'vitest'
import {
  buildMyFitnessPalPatches,
  cellToDateString,
  cellToNumber,
  cellToString,
  type MyFitnessPalRow,
} from './myFitnessPalParser'

describe('cellToDateString', () => {
  it('formats a real Date value as yyyy-MM-dd', () => {
    expect(cellToDateString(new Date('2026-01-15T00:00:00Z'))).toBe(
      '2026-01-15',
    )
  })

  it('extracts the date-only prefix from a string value', () => {
    expect(cellToDateString('2026-01-15')).toBe('2026-01-15')
    expect(cellToDateString('2026-01-15 08:30:00')).toBe('2026-01-15')
  })

  it('returns undefined for an unrecognizable value', () => {
    expect(cellToDateString(undefined)).toBeUndefined()
    expect(cellToDateString('not a date')).toBeUndefined()
    expect(cellToDateString(42)).toBeUndefined()
  })
})

describe('cellToNumber', () => {
  it('passes through a real number', () => {
    expect(cellToNumber(120.5)).toBe(120.5)
  })

  it('parses a numeric string', () => {
    expect(cellToNumber('120.5')).toBe(120.5)
  })

  it('returns undefined for empty/non-numeric values', () => {
    expect(cellToNumber('')).toBeUndefined()
    expect(cellToNumber('abc')).toBeUndefined()
    expect(cellToNumber(undefined)).toBeUndefined()
    expect(cellToNumber(Number.NaN)).toBeUndefined()
  })
})

describe('cellToString', () => {
  it('trims a string value, returning undefined when empty', () => {
    expect(cellToString('  hello  ')).toBe('hello')
    expect(cellToString('   ')).toBeUndefined()
  })

  it('stringifies a number value', () => {
    expect(cellToString(42)).toBe('42')
  })

  it('converts NBSP to ASCII spaces so imported dish names can wrap (#559)', () => {
    expect(
      cellToString(
        'Каша\u00A0овсяная\u00A0с\u00A0джемом (Level\u00A0Kitchen)',
      ),
    ).toBe('Каша овсяная с джемом (Level Kitchen)')
  })
})

describe('buildMyFitnessPalPatches', () => {
  it('maps a Measurement "weight"/"kilograms" row to weightKg', () => {
    const rows: MyFitnessPalRow[] = [
      {
        type: 'Measurement',
        date: '2026-01-15',
        description: 'weight',
        value: 72.4,
        unit: 'kilograms',
      },
    ]

    expect(buildMyFitnessPalPatches(rows).get('2026-01-15')).toEqual({
      weightKg: 72.4,
    })
  })

  it('ignores a Measurement row with a different description', () => {
    const rows: MyFitnessPalRow[] = [
      {
        type: 'Measurement',
        date: '2026-01-15',
        description: 'body_fat',
        value: 20,
        unit: 'percent',
      },
    ]

    expect(buildMyFitnessPalPatches(rows).size).toBe(0)
  })

  it('ignores a Measurement row with an unexpected unit', () => {
    const rows: MyFitnessPalRow[] = [
      {
        type: 'Measurement',
        date: '2026-01-15',
        description: 'weight',
        value: 160,
        unit: 'pounds',
      },
    ]

    expect(buildMyFitnessPalPatches(rows).size).toBe(0)
  })

  it('groups Foods rows into one CalorieEntry per (date, meal), reading details_json', () => {
    const rows: MyFitnessPalRow[] = [
      {
        type: 'Foods',
        date: '2026-01-15',
        description: 'Oatmeal',
        calories: 300,
        proteinG: 10,
        fatG: 5,
        carbsG: 50,
        fiberG: 8,
        detailsJson: JSON.stringify({ meal: 'Breakfast', brand_name: 'Quaker' }),
      },
      {
        type: 'Foods',
        date: '2026-01-15',
        description: 'Banana',
        calories: 100,
        detailsJson: JSON.stringify({ meal: 'Breakfast' }),
      },
      {
        type: 'Foods',
        date: '2026-01-15',
        description: 'Chicken breast',
        calories: 400,
        detailsJson: JSON.stringify({ meal: 'Dinner', brand_name: 'Perdue' }),
      },
    ]

    const patch = buildMyFitnessPalPatches(rows).get('2026-01-15')
    expect(patch?.calorieEntries).toHaveLength(2)

    const breakfast = patch?.calorieEntries?.find((e) => e.label === 'Breakfast')
    expect(breakfast?.items).toHaveLength(2)
    expect(breakfast?.items[0]).toMatchObject({
      name: 'Oatmeal',
      brand: 'Quaker',
      amountKcal: 300,
      proteinG: 10,
      fatG: 5,
      carbsG: 50,
      fiberG: 8,
    })
    expect(breakfast?.items[1]).toMatchObject({ name: 'Banana', amountKcal: 100 })
    expect(breakfast?.createdAt).toBe('2026-01-15T12:00:00.000Z')
    expect(breakfast?.timeEaten).toBe('08:00')

    const dinner = patch?.calorieEntries?.find((e) => e.label === 'Dinner')
    expect(dinner?.items).toHaveLength(1)
    expect(dinner?.items[0]).toMatchObject({ name: 'Chicken breast', brand: 'Perdue' })
    expect(dinner?.timeEaten).toBe('19:00')
  })

  it('maps MFP Snacks label to the snack default time (#580)', () => {
    const rows: MyFitnessPalRow[] = [
      {
        type: 'Foods',
        date: '2026-01-15',
        description: 'Yogurt',
        calories: 150,
        detailsJson: JSON.stringify({ meal: 'Snacks' }),
      },
    ]
    const snack = buildMyFitnessPalPatches(rows)
      .get('2026-01-15')
      ?.calorieEntries?.find((e) => e.label === 'Snacks')
    expect(snack?.timeEaten).toBe('16:00')
  })

  it('stamps remembered slot times when provided (#588)', () => {
    const rows: MyFitnessPalRow[] = [
      {
        type: 'Foods',
        date: '2026-01-15',
        description: 'Eggs',
        calories: 200,
        detailsJson: JSON.stringify({ meal: 'Breakfast' }),
      },
      {
        type: 'Foods',
        date: '2026-01-15',
        description: 'Steak',
        calories: 500,
        detailsJson: JSON.stringify({ meal: 'Dinner' }),
      },
    ]
    const prefs = {
      breakfast: '12:00',
      lunch: '15:00',
      dinner: '21:00',
      snack: '18:00',
    }
    const patch = buildMyFitnessPalPatches(rows, prefs).get('2026-01-15')
    expect(
      patch?.calorieEntries?.find((e) => e.label === 'Breakfast')?.timeEaten,
    ).toBe('12:00')
    expect(
      patch?.calorieEntries?.find((e) => e.label === 'Dinner')?.timeEaten,
    ).toBe('21:00')
  })

  it('still creates an item with no label when details_json is missing or malformed', () => {
    const rows: MyFitnessPalRow[] = [
      { type: 'Foods', date: '2026-01-15', description: 'Apple', calories: 95 },
      {
        type: 'Foods',
        date: '2026-01-15',
        description: 'Toast',
        calories: 150,
        detailsJson: 'not valid json',
      },
    ]

    const patch = buildMyFitnessPalPatches(rows).get('2026-01-15')
    expect(patch?.calorieEntries).toHaveLength(1)
    expect(patch?.calorieEntries?.[0].label).toBeUndefined()
    expect(patch?.calorieEntries?.[0].items).toHaveLength(2)
  })

  it('normalizes NBSP in Foods description and brand_name (#559)', () => {
    const rows: MyFitnessPalRow[] = [
      {
        type: 'Foods',
        date: '2026-01-15',
        description:
          'Каша\u00A0овсяная\u00A0с\u00A0чиа\u00A0и\u00A0фруктовым\u00A0джемом',
        calories: 121,
        detailsJson: JSON.stringify({
          meal: 'Breakfast',
          brand_name: 'Level\u00A0Kitchen',
        }),
      },
    ]

    const breakfast = buildMyFitnessPalPatches(rows)
      .get('2026-01-15')
      ?.calorieEntries?.find((e) => e.label === 'Breakfast')
    expect(breakfast?.items[0]).toMatchObject({
      name: 'Каша овсяная с чиа и фруктовым джемом',
      brand: 'Level Kitchen',
    })
  })

  it('ignores a Foods row with no calories value', () => {
    const rows: MyFitnessPalRow[] = [
      { type: 'Foods', date: '2026-01-15', description: 'Mystery item' },
    ]

    expect(buildMyFitnessPalPatches(rows).size).toBe(0)
  })

  it('combines a weight measurement and meals for the same date into one patch', () => {
    const rows: MyFitnessPalRow[] = [
      {
        type: 'Measurement',
        date: '2026-01-15',
        description: 'weight',
        value: 70,
        unit: 'kilograms',
      },
      {
        type: 'Foods',
        date: '2026-01-15',
        description: 'Oatmeal',
        calories: 300,
        detailsJson: JSON.stringify({ meal: 'Breakfast' }),
      },
    ]

    const patch = buildMyFitnessPalPatches(rows).get('2026-01-15')
    expect(patch?.weightKg).toBe(70)
    expect(patch?.calorieEntries).toHaveLength(1)
  })
})
