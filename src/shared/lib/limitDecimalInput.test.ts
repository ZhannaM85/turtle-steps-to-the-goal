import { describe, expect, it } from 'vitest'
import {
  limitToOneDecimalPlace,
  roundToOneDecimalPlace,
} from './limitDecimalInput'

describe('limitToOneDecimalPlace (#800)', () => {
  it('leaves integers and a trailing separator alone', () => {
    expect(limitToOneDecimalPlace('199')).toBe('199')
    expect(limitToOneDecimalPlace('1.')).toBe('1.')
    expect(limitToOneDecimalPlace('1,')).toBe('1,')
    expect(limitToOneDecimalPlace('')).toBe('')
  })

  it('keeps one fraction digit and drops the rest', () => {
    expect(limitToOneDecimalPlace('1.6')).toBe('1.6')
    expect(limitToOneDecimalPlace('1.66')).toBe('1.6')
    expect(limitToOneDecimalPlace('1.66662580')).toBe('1.6')
    expect(limitToOneDecimalPlace('14.45558844')).toBe('14.4')
    expect(limitToOneDecimalPlace('1,66662580')).toBe('1,6')
  })
})

describe('roundToOneDecimalPlace (#800)', () => {
  it('rounds paste to 1 decimal and keeps comma vs dot', () => {
    expect(roundToOneDecimalPlace('1.66662580')).toBe('1.7')
    expect(roundToOneDecimalPlace('14.45558844')).toBe('14.5')
    expect(roundToOneDecimalPlace('1,66662580')).toBe('1,7')
    expect(roundToOneDecimalPlace('199')).toBe('199')
    expect(roundToOneDecimalPlace('  ')).toBe('')
  })
})
