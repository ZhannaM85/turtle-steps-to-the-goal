import { describe, expect, it } from 'vitest'
import { parseNumberInput } from './parseNumberInput'

describe('parseNumberInput', () => {
  it('returns undefined for an empty string', () => {
    expect(parseNumberInput('')).toBeUndefined()
  })

  it('parses a plain integer', () => {
    expect(parseNumberInput('59')).toBe(59)
  })

  it('parses a dot-decimal value', () => {
    expect(parseNumberInput('59.5')).toBe(59.5)
  })

  it('parses a comma-decimal value', () => {
    expect(parseNumberInput('59,5')).toBe(59.5)
  })

  it('returns NaN for unparseable input', () => {
    expect(parseNumberInput('abc')).toBeNaN()
  })

  it('returns undefined for undefined/null (RHF default-value ref-attach)', () => {
    expect(parseNumberInput(undefined)).toBeUndefined()
    expect(parseNumberInput(null)).toBeUndefined()
  })

  it('passes an already-numeric value through unchanged (RHF default-value ref-attach)', () => {
    expect(parseNumberInput(80)).toBe(80)
  })
})
