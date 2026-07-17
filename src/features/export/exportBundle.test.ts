import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { FoodOverride } from '@/domain/foodOverride'
import type { Goal } from '@/domain/goal'
import type { MealItem } from '@/domain/mealItem'
import { buildExportBundle } from './exportBundle'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'item-1',
    name: 'Pizza',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeFoodOverride(overrides: Partial<FoodOverride> = {}): FoodOverride {
  return {
    foodId: 'food-1',
    hidden: true,
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildExportBundle', () => {
  it('wraps goals and entries with a version and export timestamp', () => {
    const goals = [makeGoal()]
    const entries = [makeEntry()]
    const bundle = buildExportBundle(goals, entries, [], [])

    expect(bundle.version).toBe(6)
    expect(bundle.goals).toEqual(goals)
    expect(bundle.dailyEntries).toEqual(entries)
    expect(() => new Date(bundle.exportedAt).toISOString()).not.toThrow()
  })

  it('handles no data at all (empty backup)', () => {
    const bundle = buildExportBundle([], [], [], [])
    expect(bundle.goals).toEqual([])
    expect(bundle.dailyEntries).toEqual([])
    expect(bundle.mealItems).toEqual([])
    expect(bundle.foodOverrides).toEqual([])
  })

  it('includes meal items and food overrides (#113)', () => {
    const mealItems = [makeMealItem()]
    const foodOverrides = [makeFoodOverride()]
    const bundle = buildExportBundle([], [], mealItems, foodOverrides)

    expect(bundle.mealItems).toEqual(mealItems)
    expect(bundle.foodOverrides).toEqual(foodOverrides)
  })
})
