import { create } from 'zustand'

interface FastingWindowToastState {
  hours: number | null
  /** The date (YYYY-MM-DD) this toast is *about* — the day whose first
   * meal triggered it. Not persisted (in-memory only, same as
   * `useMealItemStore`'s own plain `create()`, no `persist` middleware) —
   * this is a "just happened" notification, not something that should
   * survive a reload. Needed because `saveEditMeal()`'s "add a time to an
   * already-logged meal" path runs inside the dedicated single-meal edit
   * route (`MealEditScreen.tsx`), which navigates back to Today the
   * instant the save completes (`onFocusedMealDone`) — unmounting that
   * `MealList` instance before local component state could ever render
   * the toast. Lifting it out to a shared store lets Today's *own*
   * `MealList` mount (a different component instance, same store) pick up
   * the value after the navigation. Keying by date guards against a stale
   * toast (set while editing one day) showing up after navigating
   * somewhere unrelated to that day. */
  date: string | null
  show: (hours: number, date: string) => void
  dismiss: () => void
}

export const useFastingWindowToastStore = create<FastingWindowToastState>(
  (set) => ({
    hours: null,
    date: null,
    show: (hours, date) => set({ hours, date }),
    dismiss: () => set({ hours: null, date: null }),
  }),
)
