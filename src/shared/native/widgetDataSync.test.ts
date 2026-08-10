import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { buildWidgetSnapshot } from './widgetDataSync'

function entry(partial: Partial<DailyEntry> & { date: string }): DailyEntry {
  return {
    id: `entry-${partial.date}`,
    updatedAt: '2026-08-10T12:00:00.000Z',
    createdAt: '2026-08-10T12:00:00.000Z',
    ...partial,
  }
}

function meal(id: string, kcal: number): CalorieEntry {
  return {
    id,
    createdAt: '2026-08-10T12:00:00.000Z',
    items: [{ id: `${id}-item`, amountKcal: kcal }],
  }
}

const goalWithTarget = {
  id: 'g1',
  targetWeeklyLossKg: 0.2,
  weekStart: '2026-08-04',
  weekEnd: '2026-08-10',
  dailyCalorieTargetKcal: 1800,
  createdAt: '2026-08-04T00:00:00.000Z',
  updatedAt: '2026-08-04T00:00:00.000Z',
} satisfies Goal

describe('buildWidgetSnapshot (#687)', () => {
  it('shows em dash for unset weight and unset calorie target', () => {
    const snap = buildWidgetSnapshot({
      date: '2026-08-10',
      entry: undefined,
      goal: null,
      unit: 'kg',
      locale: 'en',
    })
    expect(snap.weightText).toBeNull()
    expect(snap.remainingKcalText).toBe('—')
    expect(snap.stepsText).toBeNull()
    expect(snap.foodText).toBeNull()
    expect(snap.noteLoggedText).toBeNull()
  })

  it('formats weight, remaining kcal, steps, food, and note indicator', () => {
    const snap = buildWidgetSnapshot({
      date: '2026-08-10',
      entry: entry({
        date: '2026-08-10',
        weightKg: 58.9,
        steps: 8432,
        note: ' Felt good ',
        calorieEntries: [meal('m1', 500), meal('m2', 700)],
      }),
      goal: goalWithTarget,
      unit: 'kg',
      locale: 'en',
    })
    expect(snap.weightText).toMatch(/58\.9/)
    expect(snap.remainingKcalText).toMatch(/600/)
    expect(snap.remainingKcalText).toMatch(/kcal remaining/)
    expect(snap.stepsText).toBe('8,432 steps')
    expect(snap.foodText).toBe('2 meals logged · 1,200 kcal')
    expect(snap.noteLoggedText).toBe("Day's note")
  })

  it('omits note indicator when note is blank', () => {
    const snap = buildWidgetSnapshot({
      date: '2026-08-10',
      entry: entry({ date: '2026-08-10', note: '   ' }),
      goal: null,
      unit: 'kg',
      locale: 'en',
    })
    expect(snap.noteLoggedText).toBeNull()
  })

  it('shows food kcal from dayTotals without meals', () => {
    const snap = buildWidgetSnapshot({
      date: '2026-08-10',
      entry: entry({
        date: '2026-08-10',
        dayTotals: { amountKcal: 900 },
      }),
      goal: null,
      unit: 'kg',
      locale: 'en',
    })
    expect(snap.foodText).toBe('900 kcal')
  })
})
