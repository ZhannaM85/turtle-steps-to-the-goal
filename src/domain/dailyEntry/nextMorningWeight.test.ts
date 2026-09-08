import { describe, expect, it } from 'vitest'
import { nextMorningWeight } from './nextMorningWeight'

describe('nextMorningWeight (#829)', () => {
  it('returns null when the next calendar day has no weight', () => {
    expect(nextMorningWeight(59.65, undefined)).toBeNull()
  })

  it('shows the next morning weight and signed change when both days have weight', () => {
    const result = nextMorningWeight(59.65, 59.95)
    expect(result).not.toBeNull()
    expect(result?.weightKg).toBe(59.95)
    expect(result?.changeKg).toBeCloseTo(0.3)
  })

  it('omits the change when the current day has no weight', () => {
    expect(nextMorningWeight(undefined, 59.95)).toEqual({
      weightKg: 59.95,
      changeKg: null,
    })
  })
})
