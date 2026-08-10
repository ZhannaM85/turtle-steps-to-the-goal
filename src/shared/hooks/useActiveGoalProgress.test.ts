import 'fake-indexeddb/auto'
import { renderHook, waitFor } from '@testing-library/react'
import { addDays, format } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalCelebrationStore, useGoalStore } from '@/stores'
import { useActiveGoalProgress } from './useActiveGoalProgress'

const DATE_FORMAT = 'yyyy-MM-dd'
// weekStart 6 days ago -> weekEnd (goalWeekEnd) is today.
const WEEK_START = format(addDays(new Date(), -6), DATE_FORMAT)
const TODAY = format(new Date(), DATE_FORMAT)

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    weekStart: WEEK_START,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

let idCounter = 0
function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = new Date().toISOString()
  return {
    id: `active-progress-entry-${idCounter}`,
    date: WEEK_START,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
  useDailyEntryStore.setState({
    date: null,
    entry: null,
    status: 'idle',
    error: null,
  })
  useGoalCelebrationStore.setState({
    celebratedInProgressWeekStart: null,
    celebratedCompleteWeekStart: null,
    reachedOnLastDayWeekStart: null,
  })
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
})

describe('useActiveGoalProgress: locking in a last-day reach (#667)', () => {
  it('locks finalTargetMet true once reached on weekEnd, surviving a later same-day heavier re-weigh', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    await db.dailyEntries.put(makeEntry({ date: WEEK_START, weightKg: 80 }))
    const todayEntry = makeEntry({ date: TODAY, weightKg: 79 }) // meets the 1kg target today
    await db.dailyEntries.put(todayEntry)

    const { result } = renderHook(() => useActiveGoalProgress())

    await waitFor(() => expect(result.current?.finalTargetMet).toBe(true))
    // The lock is persisted the moment it's first detected, not only once
    // the modal is dismissed (see goalCelebrationStore.ts).
    await waitFor(() =>
      expect(
        useGoalCelebrationStore.getState().reachedOnLastDayWeekStart,
      ).toBe(WEEK_START),
    )

    // DailyEntry keeps one weightKg per date — a later re-weigh the same
    // day overwrites (same id) today's entry rather than adding a second
    // one, same as real edits via the daily-entry form.
    const heavierTodayEntry = { ...todayEntry, weightKg: 81 } // now short of the target
    await db.dailyEntries.put(heavierTodayEntry)
    // Same trigger useActiveGoalProgress's own re-fetch effect keys off.
    useDailyEntryStore.setState({ entry: heavierTodayEntry })

    // Give the re-fetch a moment to land, then assert it did NOT flip
    // finalTargetMet back to false.
    await waitFor(() => expect(result.current?.currentWeightKg).toBe(81))
    expect(result.current?.finalTargetMet).toBe(true)
  })

  it('does not lock a window that has not been reached', async () => {
    await useGoalStore.getState().saveGoal(makeGoal())
    await db.dailyEntries.put(makeEntry({ date: WEEK_START, weightKg: 80 }))
    await db.dailyEntries.put(makeEntry({ date: TODAY, weightKg: 79.8 })) // short of target

    const { result } = renderHook(() => useActiveGoalProgress())

    await waitFor(() => expect(result.current?.currentWeightKg).toBe(79.8))
    expect(result.current?.finalTargetMet).toBe(false)
    expect(
      useGoalCelebrationStore.getState().reachedOnLastDayWeekStart,
    ).toBeNull()
  })
})
