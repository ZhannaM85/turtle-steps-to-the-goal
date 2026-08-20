import { describe, expect, it } from 'vitest'
import { getDictionary } from '@/i18n'
import {
  defaultTimeEatenForMealLabel,
  editableMealLabel,
  effectiveMealLabel,
  effectiveTimeEaten,
  mealLabelSuggestionsForLocale,
  sortCalorieEntriesByLoggedTime,
} from './mealLabel'

describe('mealLabel helpers', () => {
  const en = getDictionary('en')
  const ru = getDictionary('ru')

  it('effectiveMealLabel falls back for unset or blank custom labels (#141/#568)', () => {
    expect(effectiveMealLabel(en, 1, undefined)).toBe('Breakfast')
    expect(effectiveMealLabel(en, 1, '')).toBe('Breakfast')
    expect(effectiveMealLabel(en, 1, 'Brunch')).toBe('Brunch')
  })

  it('editableMealLabel keeps an explicit empty string (#568)', () => {
    expect(editableMealLabel(en, 1, undefined)).toBe('Breakfast')
    expect(editableMealLabel(en, 1, '')).toBe('')
    expect(editableMealLabel(en, 1, 'Brunch')).toBe('Brunch')
  })

  it('mealLabelSuggestionsForLocale hides other-locale built-ins (#567)', () => {
    expect(
      mealLabelSuggestionsForLocale(ru, [
        'Breakfast',
        'Завтрак',
        'Перекус',
        'Brunch',
      ]),
    ).toEqual(['Завтрак', 'Обед', 'Ужин', 'Перекус', 'Brunch'])

    expect(
      mealLabelSuggestionsForLocale(en, ['Завтрак', 'Snack', 'Brunch']),
    ).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Brunch'])
  })

  it('defaultTimeEatenForMealLabel maps known slots including MFP Snacks (#580)', () => {
    expect(defaultTimeEatenForMealLabel('Breakfast')).toBe('08:00')
    expect(defaultTimeEatenForMealLabel('Lunch')).toBe('13:00')
    expect(defaultTimeEatenForMealLabel('Dinner')).toBe('19:00')
    expect(defaultTimeEatenForMealLabel('Snack')).toBe('16:00')
    expect(defaultTimeEatenForMealLabel('Snacks')).toBe('16:00')
    expect(defaultTimeEatenForMealLabel('Завтрак')).toBe('08:00')
    expect(defaultTimeEatenForMealLabel('Brunch')).toBeUndefined()
    expect(defaultTimeEatenForMealLabel(undefined)).toBeUndefined()
  })

  it('defaultTimeEatenForMealLabel uses remembered slot prefs when passed (#588)', () => {
    const prefs = {
      breakfast: '12:00',
      lunch: '15:00',
      dinner: '21:00',
      snack: '18:00',
    }
    expect(defaultTimeEatenForMealLabel('Breakfast', prefs)).toBe('12:00')
    expect(defaultTimeEatenForMealLabel('Snacks', prefs)).toBe('18:00')
    expect(defaultTimeEatenForMealLabel('Ужин', prefs)).toBe('21:00')
  })

  it('effectiveTimeEaten prefers a recorded time over the slot default (#580)', () => {
    expect(effectiveTimeEaten({ label: 'Breakfast', timeEaten: '07:15' })).toBe(
      '07:15',
    )
    expect(effectiveTimeEaten({ label: 'Breakfast' })).toBe('08:00')
    expect(
      effectiveTimeEaten(
        { label: 'Breakfast' },
        {
          breakfast: '12:00',
          lunch: '15:00',
          dinner: '21:00',
          snack: '18:00',
        },
      ),
    ).toBe('12:00')
  })

  it('coerces numeric meal labels instead of throwing (#579/#587)', () => {
    // Historical IndexedDB / backup rows used numbers as meal-slot ids;
    // #580's slot-default path must not call `.trim()` on a non-string.
    expect(effectiveMealLabel(en, 1, 503)).toBe('503')
    expect(editableMealLabel(en, 1, 503)).toBe('503')
    expect(defaultTimeEatenForMealLabel(503)).toBeUndefined()
    expect(effectiveTimeEaten({ label: 503 })).toBeUndefined()
    expect(effectiveTimeEaten({ label: 503, timeEaten: '21:30' })).toBe('21:30')
  })

  it('sortCalorieEntriesByLoggedTime is earliest-first; untimed last (#597)', () => {
    const sorted = sortCalorieEntriesByLoggedTime([
      { id: 'd', label: 'Dinner', timeEaten: '21:00' },
      { id: 'l', label: 'Lunch', timeEaten: '15:00' },
      { id: 'b', label: 'Breakfast', timeEaten: '12:00' },
      { id: 'x', label: 'Brunch' },
    ])
    expect(sorted.map((m) => m.id)).toEqual(['b', 'l', 'd', 'x'])
  })

  it('sortCalorieEntriesByLoggedTime uses slot defaults when time is missing (#597)', () => {
    const sorted = sortCalorieEntriesByLoggedTime([
      { id: 'd', label: 'Dinner' },
      { id: 'b', label: 'Breakfast' },
      { id: 'l', label: 'Lunch' },
    ])
    expect(sorted.map((m) => m.id)).toEqual(['b', 'l', 'd'])
  })

  it('sorts a past-midnight meal after the evening it followed, given a real day-start time (#621)', () => {
    const meals = [
      { id: 'night', label: 'Night snack', timeEaten: '01:00' },
      { id: 'lunch', label: 'Lunch', timeEaten: '14:09' },
      { id: 'lunch2', label: 'Lunch two', timeEaten: '15:23' },
    ]
    // Day starts at 04:00 — 01:00 is before that cutoff, so it belongs to
    // the tail of the previous evening, not the start of a new one.
    const sorted = sortCalorieEntriesByLoggedTime(meals, undefined, '04:00')
    expect(sorted.map((m) => m.id)).toEqual(['lunch', 'lunch2', 'night'])
  })

  it('keeps the plain clock-time order when no day-start time is passed (default 00:00, #621)', () => {
    const meals = [
      { id: 'night', label: 'Night snack', timeEaten: '01:00' },
      { id: 'lunch', label: 'Lunch', timeEaten: '14:09' },
    ]
    const sorted = sortCalorieEntriesByLoggedTime(meals)
    expect(sorted.map((m) => m.id)).toEqual(['night', 'lunch'])
  })

  it('keeps 08:27 before 11:00 when day-start is 10:00 (#755)', () => {
    const meals = [
      { id: 'later', label: 'Lunch two', timeEaten: '11:00' },
      { id: 'earlier', label: 'Lunch', timeEaten: '08:27' },
    ]
    const sorted = sortCalorieEntriesByLoggedTime(meals, undefined, '10:00')
    expect(sorted.map((m) => m.id)).toEqual(['earlier', 'later'])
  })
})
