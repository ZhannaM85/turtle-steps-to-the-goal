import { describe, expect, it } from 'vitest'
import { getDictionary } from '@/i18n'
import {
  defaultTimeEatenForMealLabel,
  editableMealLabel,
  effectiveMealLabel,
  effectiveTimeEaten,
  mealLabelSuggestionsForLocale,
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
})
