/**
 * #689 — Goal lifecycle HARD LOCK pack
 *
 * ONE place to run/extend when touching goal baseline, windows, Start-new,
 * or goal-stack delete. CI fails if any of these six invariants is inverted.
 *
 * Related: `goalWindowProgress.ts` (#676 HARD LOCK comment), GoalForm,
 * `goalFormMapping.ts`, `goalStore.ts`. Companion UI smoke: e2e/goal-flows (#690).
 */
import 'fake-indexeddb/auto'
import { addDays, format, subDays } from 'date-fns'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import {
  goalWeekEnd,
  goalWindowConcluded,
  goalWindowProgress,
  resolveBaselineWeightKg,
} from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useGoalStore } from '@/stores'
import { GoalForm } from '@/features/goal-setup/GoalForm'
import {
  defaultWeekStartDate,
  formValuesToGoal,
  resolveWeightForFreshBaseline,
} from '@/features/goal-setup/goalFormMapping'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 0.2,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(
  date: string,
  weightKg: number,
  overrides: Partial<DailyEntry> = {},
): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date,
    weightKg,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function renderGoalForm(ui: React.ReactElement) {
  const router = createMemoryRouter(
    [{ path: '/goal', element: ui }],
    { initialEntries: ['/goal'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('#689 goal lifecycle HARD LOCK pack', () => {
  describe('1. #676 snapshot-first baseline (DO NOT INVERT)', () => {
    it('keeps frozen baselineWeightKg when weekStart is logged later', () => {
      const goal = makeGoal({
        weekStart: '2026-08-10',
        baselineWeightKg: 58.65,
      })
      const entries = [
        makeEntry('2026-08-09', 58.65),
        makeEntry('2026-08-10', 58.9),
      ]

      expect(resolveBaselineWeightKg(goal, entries)).toBe(58.65)
      expect(goalWindowProgress(entries, goal)?.baselineWeightKg).toBe(58.65)
    })
  })

  describe('2. #681 save-time weekStart weigh-in (not read-time override)', () => {
    it('prefers weekStart weigh-in over a different latestWeightKg when freezing', () => {
      const weekStart = '2026-08-04'
      const weight = resolveWeightForFreshBaseline(weekStart, 58.65, [
        makeEntry(weekStart, 58.85),
        makeEntry('2026-08-10', 58.65),
      ])

      expect(weight).toBe(58.85)

      const goal = formValuesToGoal(
        {
          targetWeeklyLoss: 0.2,
          weekStartDate: weekStart,
          weekEndDate: goalWeekEnd(weekStart),
        },
        'kg',
        null,
        false,
        weight,
      )
      expect(goal.baselineWeightKg).toBe(58.85)
      // Read path must still honor that snapshot if weekStart later changes.
      expect(
        resolveBaselineWeightKg(goal, [
          makeEntry(weekStart, 59.0),
          makeEntry('2026-08-10', 58.65),
        ]),
      ).toBe(58.85)
    })
  })

  describe('3. #667 last-day reach unlocks conclusion', () => {
    it('treats weekEnd + finalTargetMet as concluded even when calendar has not passed weekEnd', () => {
      const weekEnd = format(new Date(), 'yyyy-MM-dd')
      const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const progress = {
        weekEnd,
        finalTargetMet: true as boolean | null,
      }

      expect(goalWindowConcluded(progress, weekEnd)).toBe(true)
      expect(goalWindowConcluded(progress, weekStart)).toBe(false)
    })

    it('enables Start a new goal when activeGoalConcluded is true mid calendar window', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      renderGoalForm(
        <GoalForm
          existingGoal={makeGoal({
            id: 'g1',
            weekStart: today,
            targetWeeklyLossKg: 1,
          })}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
          activeGoalConcluded
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Start a new goal' }),
      ).toBeEnabled()
    })
  })

  describe('4. #671 no inclusive window overlap on same-day restart', () => {
    it('defaults the next start to tomorrow when prior weekEnd is today', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const prior = makeGoal({ weekStart, weekEnd: today })

      expect(defaultWeekStartDate(prior)).toBe(
        format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      )

      const next = formValuesToGoal(
        { targetWeeklyLoss: 0.2 },
        'kg',
        prior,
        true,
      )
      expect(next.weekStart).toBe(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
      expect(next.weekStart).not.toBe(today)
    })
  })

  describe('5. #686 Start-new stays disabled mid-window', () => {
    it('disables Start a new goal while the active window is still running', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      renderGoalForm(
        <GoalForm
          existingGoal={makeGoal({
            id: 'g1',
            weekStart: today,
            targetWeeklyLossKg: 1,
          })}
          onSubmit={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Start a new goal' }),
      ).toBeDisabled()
    })
  })

  describe('6. #677 delete pops the goal stack', () => {
    beforeEach(async () => {
      await db.goals.clear()
      useGoalStore.setState({ goal: null, status: 'idle', error: null })
    })

    afterEach(async () => {
      await db.goals.clear()
    })

    it('promotes the previous goal immediately after deleting the active one', async () => {
      const older = makeGoal({
        id: 'older',
        createdAt: '2026-08-04T00:00:00.000Z',
        weekStart: '2026-08-04',
      })
      const active = makeGoal({
        id: 'active',
        createdAt: '2026-08-10T00:00:00.000Z',
        weekStart: '2026-08-10',
      })
      await useGoalStore.getState().saveGoal(older)
      await useGoalStore.getState().saveGoal(active)

      await useGoalStore.getState().deleteGoal()

      expect(useGoalStore.getState().goal).toEqual(older)
    })
  })
})
