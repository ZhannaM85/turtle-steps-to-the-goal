import { describe, expect, it } from 'vitest'
import {
  limitToMaxFractionDigits,
  roundToMaxFractionDigits,
} from './limitDecimalInput'

describe('limitToMaxFractionDigits (#800)', () => {
  it('leaves integers and a trailing separator alone', () => {
    expect(limitToMaxFractionDigits('199', 2)).toBe('199')
    expect(limitToMaxFractionDigits('1.', 2)).toBe('1.')
    expect(limitToMaxFractionDigits('1,', 2)).toBe('1,')
    expect(limitToMaxFractionDigits('', 2)).toBe('')
  })

  it('keeps up to two fraction digits and drops the rest', () => {
    expect(limitToMaxFractionDigits('1.6', 2)).toBe('1.6')
    expect(limitToMaxFractionDigits('1.66', 2)).toBe('1.66')
    expect(limitToMaxFractionDigits('1.66662580', 2)).toBe('1.66')
    expect(limitToMaxFractionDigits('14.45558844', 2)).toBe('14.45')
    expect(limitToMaxFractionDigits('1,66662580', 2)).toBe('1,66')
  })
})

describe('roundToMaxFractionDigits (#800)', () => {
  it('rounds paste to 2 decimals and keeps comma vs dot', () => {
    expect(roundToMaxFractionDigits('1.66662580', 2)).toBe('1.67')
    expect(roundToMaxFractionDigits('14.45558844', 2)).toBe('14.46')
    expect(roundToMaxFractionDigits('1,66662580', 2)).toBe('1,67')
    expect(roundToMaxFractionDigits('199', 2)).toBe('199')
    expect(roundToMaxFractionDigits('  ', 2)).toBe('')
  })
})
