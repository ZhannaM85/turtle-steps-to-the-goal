import { describe, expect, it } from 'vitest'
import {
  roundKgToOneDecimal,
  weeklyLossTargetMet,
} from './weeklyLossTargetMet'

describe('roundKgToOneDecimal', () => {
  it('turns the 59.8 − 59.7 IEEE remainder into 0.1', () => {
    expect(59.8 - 59.7).toBe(0.09999999999999432)
    expect(59.8 - 59.7).toBeLessThan(0.1)
    expect(roundKgToOneDecimal(59.8 - 59.7)).toBe(0.1)
  })
})

describe('weeklyLossTargetMet (#971)', () => {
  it('counts the export-week exact boundary as reached (baseline 59.8, current 59.7, target 0.1)', () => {
    expect(weeklyLossTargetMet(59.8, 59.7, 0.1)).toBe(true)
  })

  it('does not count a just-under 0.04 kg loss on a 0.1 kg goal (59.8 → 59.76)', () => {
    expect(weeklyLossTargetMet(59.8, 59.76, 0.1)).toBe(false)
  })
})
