import { describe, expect, it } from 'vitest'
import { exportBundleSchema } from './exportBundleSchema'

const validBundle = {
  version: 10,
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
        version: 10,
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

  it('coerces numeric meal labels to strings (#579)', () => {
    const withNumericLabel = {
      ...validBundle,
      dailyEntries: [
        {
          ...validBundle.dailyEntries[0],
          calorieEntries: [
            {
              id: 'calorie-1',
              items: [{ id: 'item-1', amountKcal: 2000 }],
              label: 5,
              createdAt: '2026-03-01T00:00:00.000Z',
            },
          ],
        },
      ],
    }
    const parsed = exportBundleSchema.safeParse(withNumericLabel)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.dailyEntries[0].calorieEntries?.[0].label).toBe('5')
    }
  })

  it('accepts optional timeDrunk on water entries (#849)', () => {
    const withTime = {
      ...validBundle,
      dailyEntries: [
        {
          ...validBundle.dailyEntries[0],
          waterEntries: [
            { id: 'w1', amountMl: 250, timeDrunk: '08:15' },
            { id: 'w2', amountMl: 500 },
          ],
        },
      ],
    }
    const parsed = exportBundleSchema.safeParse(withTime)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.dailyEntries[0].waterEntries).toEqual([
        { id: 'w1', amountMl: 250, timeDrunk: '08:15' },
        { id: 'w2', amountMl: 500 },
      ])
    }
  })

  it('keeps a custom metric entry note (#853)', () => {
    const withNote = {
      ...validBundle,
      customMetrics: [
        {
          id: 'm-acne',
          name: 'Acne',
          inputKind: 'scale5',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      customMetricEntries: [
        {
          id: 'e-acne',
          metricId: 'm-acne',
          date: '2026-03-01',
          value: 1,
          note: 'Прыщей меньше. Посмотрим.',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }
    const parsed = exportBundleSchema.safeParse(withNote)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.customMetricEntries?.[0]?.note).toBe(
        'Прыщей меньше. Посмотрим.',
      )
    }
  })
})
