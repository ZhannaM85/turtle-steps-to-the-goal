import { describe, expect, it } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import {
  buildMealSnippetUrl,
  calorieEntryToMealSnippet,
  decodeMealSnippetPayload,
  encodeMealSnippetPayload,
  mealSnippetFitsQr,
  parseMealSnippetFromText,
  SHARE_MEAL_QUERY_PARAM,
  type MealSnippetPayload,
} from './mealSnippetPayload'

const breakfast: CalorieEntry = {
  id: 'meal-local',
  createdAt: '2026-08-14T07:10:00.000Z',
  label: 'Breakfast',
  timeEaten: '07:30',
  note: 'at home',
  reaction: 'happy',
  items: [
    {
      id: 'item-eggs',
      name: 'Scrambled eggs',
      amountKcal: 280,
      proteinG: 18,
      fatG: 20,
      carbsG: 2,
      amountG: 150,
      emotion: 'thumbsUp',
    },
    {
      id: 'item-toast',
      name: 'Toast',
      brand: 'Local bakery',
      amountKcal: 120,
      carbsG: 22,
      fiberG: 2,
      noteText: 'with butter',
    },
  ],
}

describe('mealSnippetPayload (#718)', () => {
  it('round-trips a grouped breakfast without local ids', () => {
    const payload = calorieEntryToMealSnippet(breakfast, '2026-08-14', {
      sender: 'pwa',
      createdAt: '2026-08-14T08:00:00.000Z',
    })
    expect(payload).toEqual({
      v: 1,
      kind: 'meal',
      createdAt: '2026-08-14T08:00:00.000Z',
      sender: 'pwa',
      date: '2026-08-14',
      meal: {
        label: 'Breakfast',
        note: 'at home',
        timeEaten: '07:30',
        reaction: 'happy',
        items: [
          {
            name: 'Scrambled eggs',
            amountKcal: 280,
            proteinG: 18,
            fatG: 20,
            carbsG: 2,
            amountG: 150,
            emotion: 'thumbsUp',
          },
          {
            name: 'Toast',
            brand: 'Local bakery',
            amountKcal: 120,
            carbsG: 22,
            fiberG: 2,
            noteText: 'with butter',
          },
        ],
      },
    })

    const encoded = encodeMealSnippetPayload(payload)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(mealSnippetFitsQr(encoded)).toBe(true)
    expect(decodeMealSnippetPayload(encoded)).toEqual(payload)
  })

  it('puts the payload on shareMeal in the app URL', () => {
    const payload = calorieEntryToMealSnippet(breakfast, '2026-08-14', {
      createdAt: '2026-08-14T08:00:00.000Z',
    })
    const url = buildMealSnippetUrl(payload, {
      origin: 'https://example.com',
      baseUrl: '/turtle-steps-to-the-goal/',
    })
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/turtle-steps-to-the-goal/')
    const encoded = parsed.searchParams.get(SHARE_MEAL_QUERY_PARAM)
    expect(encoded).toBeTruthy()
    expect(parseMealSnippetFromText(url)).toEqual(payload)
    expect(parseMealSnippetFromText(encoded!)).toEqual(payload)
  })

  it('returns null for truncated, unknown version, or full-backup JSON', () => {
    const payload = calorieEntryToMealSnippet(breakfast, '2026-08-14', {
      createdAt: '2026-08-14T08:00:00.000Z',
    })
    const encoded = encodeMealSnippetPayload(payload)
    expect(decodeMealSnippetPayload(encoded.slice(0, 8))).toBeNull()
    expect(decodeMealSnippetPayload('%%%')).toBeNull()

    const v2 = btoa(JSON.stringify({ ...payload, v: 2 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decodeMealSnippetPayload(v2)).toBeNull()

    const backup = btoa(
      JSON.stringify({
        goals: [],
        dailyEntries: [],
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decodeMealSnippetPayload(backup)).toBeNull()
  })

  it('does not parse a shareFood link as a meal snippet', () => {
    expect(
      parseMealSnippetFromText(
        'https://example.com/?shareFood=abc',
      ),
    ).toBeNull()
  })

  it('rejects empty item lists', () => {
    const invalid: MealSnippetPayload = {
      v: 1,
      kind: 'meal',
      createdAt: '2026-08-14T08:00:00.000Z',
      date: '2026-08-14',
      meal: { items: [] },
    }
    expect(() => encodeMealSnippetPayload(invalid)).toThrow()
  })
})
