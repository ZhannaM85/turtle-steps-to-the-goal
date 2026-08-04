import { describe, expect, it } from 'vitest'
import type {
  CustomCorrelation,
  CustomMetric,
  CustomMetricEntry,
} from '@/domain/customMetric'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { FoodOverride } from '@/domain/foodOverride'
import type { Goal } from '@/domain/goal'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
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

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'recipe-1',
    name: 'Chili',
    ingredients: [],
    servings: 4,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeCustomMetric(overrides: Partial<CustomMetric> = {}): CustomMetric {
  return {
    id: 'metric-1',
    name: 'Training session',
    inputKind: 'boolean',
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeCustomMetricEntry(
  overrides: Partial<CustomMetricEntry> = {},
): CustomMetricEntry {
  return {
    id: 'metric-entry-1',
    metricId: 'metric-1',
    date: '2026-03-01',
    value: 1,
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeCustomCorrelation(
  overrides: Partial<CustomCorrelation> = {},
): CustomCorrelation {
  return {
    id: 'correlation-1',
    metricA: { kind: 'custom', metricId: 'metric-1' },
    metricB: { kind: 'builtin', key: 'weight' },
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildExportBundle', () => {
  it('wraps goals and entries with a version and export timestamp', () => {
    const goals = [makeGoal()]
    const entries = [makeEntry()]
    const bundle = buildExportBundle(goals, entries, [], [], [], [], [], [], [])

    expect(bundle.version).toBe(9)
    expect(bundle.goals).toEqual(goals)
    expect(bundle.dailyEntries).toEqual(entries)
    expect(() => new Date(bundle.exportedAt).toISOString()).not.toThrow()
  })

  it('handles no data at all (empty backup)', () => {
    const bundle = buildExportBundle([], [], [], [], [], [], [], [], [])
    expect(bundle.goals).toEqual([])
    expect(bundle.dailyEntries).toEqual([])
    expect(bundle.mealItems).toEqual([])
    expect(bundle.foodOverrides).toEqual([])
    expect(bundle.recipes).toEqual([])
    expect(bundle.customMetrics).toEqual([])
    expect(bundle.customMetricEntries).toEqual([])
    expect(bundle.customCorrelations).toEqual([])
    expect(bundle.weeklyNotes).toEqual([])
  })

  it('includes meal items and food overrides (#113)', () => {
    const mealItems = [makeMealItem()]
    const foodOverrides = [makeFoodOverride()]
    const bundle = buildExportBundle(
      [],
      [],
      mealItems,
      foodOverrides,
      [],
      [],
      [],
      [],
      [],
    )

    expect(bundle.mealItems).toEqual(mealItems)
    expect(bundle.foodOverrides).toEqual(foodOverrides)
  })

  it('includes recipes (#251)', () => {
    const recipes = [makeRecipe()]
    const bundle = buildExportBundle([], [], [], [], recipes, [], [], [], [])

    expect(bundle.recipes).toEqual(recipes)
  })

  it('includes custom metrics, their entries, and custom correlations (#336)', () => {
    const customMetrics = [makeCustomMetric()]
    const customMetricEntries = [makeCustomMetricEntry()]
    const customCorrelations = [makeCustomCorrelation()]
    const bundle = buildExportBundle(
      [],
      [],
      [],
      [],
      [],
      customMetrics,
      customMetricEntries,
      customCorrelations,
      [],
    )

    expect(bundle.customMetrics).toEqual(customMetrics)
    expect(bundle.customMetricEntries).toEqual(customMetricEntries)
    expect(bundle.customCorrelations).toEqual(customCorrelations)
  })

  it('includes weekly notes (#557)', () => {
    const weeklyNotes = [
      {
        weekStart: '2026-07-27',
        note: 'Past week advice',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ]
    const bundle = buildExportBundle(
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      weeklyNotes,
    )
    expect(bundle.weeklyNotes).toEqual(weeklyNotes)
  })

  it('includes appearance and language (#578)', () => {
    const bundle = buildExportBundle(
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      { mood: 'tortoise', colorScheme: 'light' },
      'ru',
    )
    expect(bundle.appearance).toEqual({
      mood: 'tortoise',
      colorScheme: 'light',
    })
    expect(bundle.locale).toBe('ru')
  })
})
