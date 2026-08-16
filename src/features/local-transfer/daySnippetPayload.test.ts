import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  buildDaySnippetUrl,
  dailyEntryToDaySnippet,
  daySnippetFitsQr,
  daySnippetHasSendableContent,
  decodeDaySnippetPayload,
  encodeDaySnippetPayload,
  parseDaySnippetFromText,
  SHARE_DAY_QUERY_PARAM,
} from './daySnippetPayload'

const sleepAndBreakfast: DailyEntry = {
  id: 'entry-local',
  date: '2026-08-14',
  createdAt: '2026-08-14T07:00:00.000Z',
  updatedAt: '2026-08-14T08:00:00.000Z',
  sleepHours: 7.5,
  weightKg: 58.65,
  calorieEntries: [
    {
      id: 'meal-local',
      createdAt: '2026-08-14T07:10:00.000Z',
      label: 'Breakfast',
      timeEaten: '07:30',
      items: [
        {
          id: 'item-eggs',
          name: 'Scrambled eggs',
          amountKcal: 280,
          proteinG: 18,
        },
      ],
    },
  ],
}

describe('daySnippetPayload (#718)', () => {
  it('round-trips a day’s sleep, weight, and meals without local ids', () => {
    const payload = dailyEntryToDaySnippet(sleepAndBreakfast, {
      sender: 'pwa',
      createdAt: '2026-08-14T08:00:00.000Z',
    })
    expect(payload).toEqual({
      v: 1,
      kind: 'day',
      createdAt: '2026-08-14T08:00:00.000Z',
      sender: 'pwa',
      date: '2026-08-14',
      sleepHours: 7.5,
      weightKg: 58.65,
      calorieEntries: [
        {
          label: 'Breakfast',
          timeEaten: '07:30',
          items: [
            {
              name: 'Scrambled eggs',
              amountKcal: 280,
              proteinG: 18,
            },
          ],
        },
      ],
    })
    expect(JSON.stringify(payload)).not.toContain('entry-local')
    expect(JSON.stringify(payload)).not.toContain('meal-local')
    expect(JSON.stringify(payload)).not.toContain('item-eggs')

    const encoded = encodeDaySnippetPayload(payload)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(daySnippetFitsQr(encoded)).toBe(true)
    expect(decodeDaySnippetPayload(encoded)).toEqual(payload)
    expect(daySnippetHasSendableContent(payload)).toBe(true)
  })

  it('allows a sleep-only day with no meals', () => {
    const payload = dailyEntryToDaySnippet({
      id: 'empty-meals',
      date: '2026-08-14',
      createdAt: '2026-08-14T07:00:00.000Z',
      updatedAt: '2026-08-14T07:00:00.000Z',
      sleepHours: 8,
    })
    expect(payload.calorieEntries).toBeUndefined()
    expect(payload.sleepHours).toBe(8)
    expect(daySnippetHasSendableContent(payload)).toBe(true)
  })

  it('treats a date-only entry as having nothing to send', () => {
    const payload = dailyEntryToDaySnippet({
      id: 'blank',
      date: '2026-08-14',
      createdAt: '2026-08-14T07:00:00.000Z',
      updatedAt: '2026-08-14T07:00:00.000Z',
    })
    expect(daySnippetHasSendableContent(payload)).toBe(false)
  })

  it('puts the payload on shareDay in the app URL', () => {
    const payload = dailyEntryToDaySnippet(sleepAndBreakfast, {
      createdAt: '2026-08-14T08:00:00.000Z',
    })
    const url = buildDaySnippetUrl(payload, {
      origin: 'https://example.com',
      baseUrl: '/turtle-steps-to-the-goal/',
    })
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/turtle-steps-to-the-goal/')
    const encoded = parsed.searchParams.get(SHARE_DAY_QUERY_PARAM)
    expect(encoded).toBeTruthy()
    expect(parseDaySnippetFromText(url)).toEqual(payload)
    expect(parseDaySnippetFromText(encoded!)).toEqual(payload)
  })

  it('returns null for truncated, unknown version, meal snippets, or full-backup JSON', () => {
    const payload = dailyEntryToDaySnippet(sleepAndBreakfast, {
      createdAt: '2026-08-14T08:00:00.000Z',
    })
    const encoded = encodeDaySnippetPayload(payload)
    expect(decodeDaySnippetPayload(encoded.slice(0, 8))).toBeNull()
    expect(decodeDaySnippetPayload('%%%')).toBeNull()

    const v2 = btoa(JSON.stringify({ ...payload, v: 2 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decodeDaySnippetPayload(v2)).toBeNull()

    const meal = btoa(
      JSON.stringify({
        v: 1,
        kind: 'meal',
        createdAt: '2026-08-14T08:00:00.000Z',
        date: '2026-08-14',
        meal: { items: [{ amountKcal: 100 }] },
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decodeDaySnippetPayload(meal)).toBeNull()

    const backup = btoa(
      JSON.stringify({
        goals: [],
        dailyEntries: [],
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(decodeDaySnippetPayload(backup)).toBeNull()
  })

  it('uses a stable createdAt so the share URL does not change every call (#741)', () => {
    const first = dailyEntryToDaySnippet(sleepAndBreakfast)
    const second = dailyEntryToDaySnippet(sleepAndBreakfast)
    expect(first.createdAt).toBe(sleepAndBreakfast.updatedAt)
    expect(second.createdAt).toBe(first.createdAt)
    expect(encodeDaySnippetPayload(first)).toBe(encodeDaySnippetPayload(second))
  })

  it('does not parse a shareFood or shareMeal link as a day snippet', () => {
    expect(
      parseDaySnippetFromText('https://example.com/?shareFood=abc'),
    ).toBeNull()
    expect(
      parseDaySnippetFromText('https://example.com/?shareMeal=abc'),
    ).toBeNull()
  })
})
