import { describe, expect, it } from 'vitest'
import {
  encodeSharedFoodPayload,
  parseSharedFoodFromText,
} from '@/features/food-share/sharedFoodPayload'
import { classifyShareScan } from './classifyShareScan'
import {
  dailyEntryToDaySnippet,
  encodeDaySnippetPayload,
} from './daySnippetPayload'

describe('classifyShareScan (#723)', () => {
  it('distinguishes a day snippet from a shared-food payload', () => {
    const day = encodeDaySnippetPayload(
      dailyEntryToDaySnippet({
        id: 'd',
        date: '2026-08-14',
        createdAt: '2026-08-14T08:00:00.000Z',
        updatedAt: '2026-08-14T08:00:00.000Z',
        sleepHours: 8,
      }),
    )
    const food = encodeSharedFoodPayload({ v: 1, name: 'Salad' })
    expect(classifyShareScan(`https://example.com/?shareDay=${day}`)).toBe('day')
    expect(classifyShareScan(`https://example.com/?shareFood=${food}`)).toBe(
      'food',
    )
    expect(parseSharedFoodFromText(`https://example.com/?shareDay=${day}`)).toBeNull()
    expect(classifyShareScan('not-a-qr')).toBe('invalid')
  })
})
