import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Tracks only the most recently celebrated window's start date (#55) — a
 * new goal-anchored window (#135, `Goal.weekStart`) always has a different
 * weekStart once renewed, so comparing against just this one value is
 * enough to know "has *this* window already been celebrated," without
 * needing a growing history of every window ever celebrated.
 *
 * #639: the mid-week "crossed the target, keep going" moment is still a
 * one-time persisted dismiss (`celebratedInProgressWeekStart`). #778: the
 * end-of-window "completed!" moment is no longer permanently dismissed —
 * closing it only hides it until the offer resets (last-day weight
 * deleted, then logged again) or the screen remounts; it keeps being
 * offered until a new goal is set. `celebratedCompleteWeekStart` remains
 * in the persisted shape so older clients don't crash on rehydrate, but
 * the complete-phase hook no longer reads it.
 */
interface GoalCelebrationStoreState {
  celebratedInProgressWeekStart: string | null
  celebratedCompleteWeekStart: string | null
  /** #667 — once a goal's target is confirmed reached on the window's own
   * last day, this locks that in for the window: `DailyEntry` keeps a
   * single `weightKg` per date with no edit history, so without a
   * persisted lock, a later same-day re-weigh that overwrites today's
   * entry with a heavier value would quietly un-reach the goal (flip
   * `finalTargetMet` back to false) and re-block the new-goal restart
   * button it had just unlocked. */
  reachedOnLastDayWeekStart: string | null
  markCelebrated: (
    weekStart: string,
    phase: 'inProgress' | 'complete',
  ) => void
  markReachedOnLastDay: (weekStart: string) => void
}

export const useGoalCelebrationStore = create<GoalCelebrationStoreState>()(
  persist(
    (set) => ({
      celebratedInProgressWeekStart: null,
      celebratedCompleteWeekStart: null,
      reachedOnLastDayWeekStart: null,
      markCelebrated: (weekStart, phase) =>
        set(
          phase === 'inProgress'
            ? { celebratedInProgressWeekStart: weekStart }
            : { celebratedCompleteWeekStart: weekStart },
        ),
      markReachedOnLastDay: (weekStart) =>
        set({ reachedOnLastDayWeekStart: weekStart }),
    }),
    {
      name: 'turtle-steps-goal-celebration',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
