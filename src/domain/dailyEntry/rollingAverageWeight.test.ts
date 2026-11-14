import { describe, expect, it } from 'vitest'
import { rollingAverageWeightKg } from './rollingAverageWeight'

describe('rollingAverageWeightKg (#1126)', () => {
  const entries = [
    { date: '2026-01-01', weightKg: 90 },
    { date: '2026-03-01', weightKg: 84 },
    { date: '2026-03-02', weightKg: 80 },
    { date: '2026-03-04' },
    { date: '2026-03-08', weightKg: 82 },
  ]

  it('averages weigh-ins in the 7 days ending on the open day', () => {
    expect(rollingAverageWeightKg(entries, '2026-03-08', 7)).toBe(81)
  })

  it('returns null when the window has fewer than two weigh-ins', () => {
    expect(
      rollingAverageWeightKg([{ date: '2026-03-08', weightKg: 82 }], '2026-03-08', 7),
    ).toBeNull()
  })

  it('uses 30 and 365 day windows ending on the open day', () => {
    expect(rollingAverageWeightKg(entries, '2026-03-08', 30)).toBe(82)
    expect(rollingAverageWeightKg(entries, '2026-03-08', 365)).toBe(84)
  })
})
