import { describe, expect, it } from 'vitest'
import { calculateBmi, calculateBmr } from './bodyComposition'

describe('calculateBmi', () => {
  it('computes weight(kg) / height(m)^2', () => {
    // 70kg at 175cm -> 70 / 1.75^2 = 22.857...
    expect(calculateBmi(70, 175)).toBeCloseTo(22.857, 2)
  })

  it('reads higher for a shorter person at the same weight', () => {
    const tall = calculateBmi(70, 180)
    const short = calculateBmi(70, 160)
    expect(short).toBeGreaterThan(tall)
  })
})

describe('calculateBmr', () => {
  it('matches the Mifflin-St Jeor formula for a male', () => {
    // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    expect(calculateBmr(70, 175, 30, 'male')).toBeCloseTo(1648.75, 2)
  })

  it('matches the Mifflin-St Jeor formula for a female', () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(calculateBmr(60, 165, 25, 'female')).toBeCloseTo(1345.25, 2)
  })

  it('is 166 lower for a female than a male with identical weight/height/age', () => {
    const male = calculateBmr(70, 170, 40, 'male')
    const female = calculateBmr(70, 170, 40, 'female')
    expect(male - female).toBeCloseTo(166, 5)
  })
})
