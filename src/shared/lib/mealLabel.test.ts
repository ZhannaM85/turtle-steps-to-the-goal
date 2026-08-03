import { describe, expect, it } from 'vitest'
import { getDictionary } from '@/i18n'
import {
  editableMealLabel,
  effectiveMealLabel,
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
})
