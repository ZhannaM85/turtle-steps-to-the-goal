import { describe, expect, it } from 'vitest'
import { formatLocalizedDate, formatLocalizedShortDate } from './dateLocale'

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

describe('formatLocalizedShortDate (#953)', () => {
  it('uses the locale short date, not a day-count number', () => {
    expect(formatLocalizedShortDate('2026-03-01', 'en')).toBe('03/01/2026')
    expect(formatLocalizedShortDate('2026-03-01', 'ru')).toBe('01.03.2026')
    expect(formatLocalizedShortDate('2026-03-01', 'en')).not.toMatch(/^\d+$/)
  })

  it('returns empty for missing or invalid values', () => {
    expect(formatLocalizedShortDate('', 'en')).toBe('')
    expect(formatLocalizedShortDate('not-a-date', 'en')).toBe('')
    expect(formatLocalizedShortDate('2026-13-40', 'en')).toBe('')
  })
})
