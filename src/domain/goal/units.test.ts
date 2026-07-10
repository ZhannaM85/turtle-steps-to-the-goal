import { describe, expect, it } from 'vitest'
import { kgToLb, lbToKg } from './units'

describe('units', () => {
  it('converts lb to kg', () => {
    expect(lbToKg(1)).toBeCloseTo(0.453592, 5)
    expect(lbToKg(220.462)).toBeCloseTo(100, 2)
  })

  it('converts kg to lb', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 4)
    expect(kgToLb(100)).toBeCloseTo(220.462, 2)
  })

  it('round-trips within floating-point tolerance', () => {
    expect(kgToLb(lbToKg(150))).toBeCloseTo(150, 8)
  })

  it('treats 0 as having no variance either way', () => {
    expect(lbToKg(0)).toBe(0)
    expect(kgToLb(0)).toBe(0)
  })
})
