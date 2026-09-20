import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalWindowProgress } from './goalWindowProgress'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 0.1,
    weekStart: '2026-09-14',
    weekEnd: '2026-09-20',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(date: string, weightKg: number): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${date}`,
    date,
    weightKg,
    createdAt: now,
    updatedAt: now,
  }
}

describe('goalWindowProgress exact 0.1 kg boundary (#971)', () => {
  it('marks the export-week 59.8 → 59.7 final weigh-in as reached', () => {
    // Reproduction from the 2026-09-14…20 JSON export on #971:
    // baselineWeightKg 59.8, target 0.1, last day 59.7. IEEE-754 makes
    // 59.8 - 59.7 === 0.0999… so a raw > / >= 0.1 compare misses.
    const goal = makeGoal({ baselineWeightKg: 59.8 })
    const entries = [
      makeEntry('2026-09-14', 60.55),
      makeEntry('2026-09-15', 60.1),
      makeEntry('2026-09-16', 60.2),
      makeEntry('2026-09-17', 60.3),
      makeEntry('2026-09-18', 59.85),
      makeEntry('2026-09-19', 59.65),
      makeEntry('2026-09-20', 59.7),
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.baselineWeightKg).toBe(59.8)
    expect(progress?.currentWeightKg).toBe(59.7)
    expect(progress?.finalTargetMet).toBe(true)
    expect(progress?.targetMet).toBe(true)
  })

  it('marks a just-under 0.04 kg loss as not reached (59.8 → 59.76)', () => {
    const goal = makeGoal({ baselineWeightKg: 59.8 })
    const entries = [
      makeEntry('2026-09-14', 59.8),
      makeEntry('2026-09-20', 59.76),
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBe(false)
    expect(progress?.metOnDate).toBeNull()
    expect(progress?.finalTargetMet).toBe(false)
  })
})
