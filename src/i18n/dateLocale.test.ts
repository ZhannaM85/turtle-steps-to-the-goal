import { describe, expect, it } from 'vitest'
import { formatLocalizedDate } from './dateLocale'

describe('formatLocalizedDate', () => {
  it('formats ISO dates with English month names', () => {
    expect(formatLocalizedDate('2026-09-13', 'en')).toMatch(/Sep/)
  })

  it('formats ISO dates with Russian month names (#882)', () => {
    expect(formatLocalizedDate('2026-09-13', 'ru')).toMatch(/сент/i)
  })

  it('returns empty for missing or invalid values', () => {
    expect(formatLocalizedDate('', 'en')).toBe('')
    expect(formatLocalizedDate('not-a-date', 'en')).toBe('')
    expect(formatLocalizedDate('2026-13-40', 'en')).toBe('')
  })
})
