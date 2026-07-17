import { describe, expect, it } from 'vitest'
import { exportBundleSchema } from './exportBundleSchema'

const validBundle = {
  version: 6,
  exportedAt: '2026-07-10T00:00:00.000Z',
  goals: [
    {
      id: 'goal-1',
      targetWeeklyLossKg: 1,
      displayUnit: 'kg',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  dailyEntries: [
    {
      id: 'entry-1',
      date: '2026-03-01',
      weightKg: 80,
      calorieEntries: [
        {
          id: 'calorie-1',
          items: [{ id: 'item-1', amountKcal: 2000 }],
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ],
}

describe('exportBundleSchema', () => {
  it('accepts a well-formed bundle', () => {
    expect(exportBundleSchema.safeParse(validBundle).success).toBe(true)
  })

  it('accepts an empty bundle (no goals or entries)', () => {
    expect(
      exportBundleSchema.safeParse({
        version: 6,
        exportedAt: '2026-07-10T00:00:00.000Z',
        goals: [],
        dailyEntries: [],
      }).success,
    ).toBe(true)
  })

  it('rejects a bundle with the wrong version', () => {
    expect(
      exportBundleSchema.safeParse({ ...validBundle, version: 1 }).success,
    ).toBe(false)
  })

  it('rejects a goal missing required fields', () => {
    const malformed = {
      ...validBundle,
      goals: [{ id: 'goal-1' }],
    }
    expect(exportBundleSchema.safeParse(malformed).success).toBe(false)
  })

  it('rejects completely unrelated JSON (not a backup file)', () => {
    expect(exportBundleSchema.safeParse({ hello: 'world' }).success).toBe(false)
  })

  it('rejects a daily entry with an invalid displayUnit-shaped field bleeding in', () => {
    const malformed = {
      ...validBundle,
      dailyEntries: [{ ...validBundle.dailyEntries[0], weightKg: 'eighty' }],
    }
    expect(exportBundleSchema.safeParse(malformed).success).toBe(false)
  })
})
