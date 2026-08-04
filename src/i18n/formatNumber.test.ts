import { describe, expect, it } from 'vitest'
import { formatExactNumber } from './formatNumber'

describe('formatExactNumber', () => {
  it('shows full entered precision instead of rounding to 1 decimal', () => {
    expect(formatExactNumber(59.25, 'en')).toBe('59.25')
  })

  it('does not pad a whole number with a trailing .0', () => {
    expect(formatExactNumber(60, 'en')).toBe('60')
  })

  it('caps at 2 decimals and rounds correctly despite floating-point noise', () => {
    expect(formatExactNumber(59.25 - 58.1, 'en')).toBe('1.15')
  })

  it('uses a decimal comma for ru locale', () => {
    expect(formatExactNumber(59.25, 'ru')).toBe('59,25')
  })

  it('shows full entered weekly-pace precision instead of rounding to 1 decimal (#586)', () => {
    expect(formatExactNumber(0.28, 'en')).toBe('0.28')
    expect(formatExactNumber(0.28, 'ru')).toBe('0,28')
  })
})
