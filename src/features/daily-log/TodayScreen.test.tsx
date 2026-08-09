import 'fake-indexeddb/auto'
import type { ReactNode } from 'react'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format, subDays } from 'date-fns'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/domain/goal'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  DEFAULT_TODAY_CARD_ORDER,
  useCustomMetricStore,
  useDailyEntryStore,
  useDailyReminderStore,
  useDayStartStore,
  useGoalStore,
  useNutritionFactsStore,
  usePlannedMealsTrackingStore,
  usePlannedMealStore,
  useProfileStore,
  useSectionVisibilityStore,
  useTodayCardOrderStore,
  useTodaySectionsCollapseStore,
  useWaterTrackingStore,
} from '@/stores'
import { TodayScreen } from './TodayScreen'

// #343 — same reasoning DashboardScreen.test.tsx's own #297 reorder tests
// already documented: jsdom has no layout engine, so a real pointer/
// keyboard drag can't produce meaningful rects for dnd-kit's collision
// detection. Trust dnd-kit itself to turn real gestures into
// DragEndEvents, and only test this screen's own onDragEnd wiring by
// capturing and invoking it directly with a synthetic event.
let capturedOnCardDragEnd:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | undefined

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: {
      onDragEnd: typeof capturedOnCardDragEnd
      children: ReactNode
    }) => {
      capturedOnCardDragEnd = props.onDragEnd
      return props.children
    },
  }
})

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    weekStart: format(new Date(), 'yyyy-MM-dd'),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: format(new Date(), 'yyyy-MM-dd'),
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.customMetrics.clear()
  await db.customMetricEntries.clear()
  await db.plannedMeals.clear()
  localStorage.clear()
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
  usePlannedMealStore.setState({ plannedMeals: [], status: 'idle', error: null })
  useCustomMetricStore.setState({
    metrics: [],
    entries: [],
    status: 'idle',
    error: null,
  })
  useDailyEntryStore.setState({
    date: null,
    entry: null,
    status: 'idle',
    error: null,
  })
  useDailyReminderStore.setState({ enabled: false })
  useProfileStore.setState({ heightCm: undefined, age: undefined, sex: undefined })
  useDayStartStore.setState({ dayStartTime: '00:00', startedEarlyForDate: null })
  useTodayCardOrderStore.persist.clearStorage()
  useTodayCardOrderStore.setState({ order: DEFAULT_TODAY_CARD_ORDER })
  useTodaySectionsCollapseStore.setState({
    sections: {
      morning: false,
      stats: false,
      macros: false,
      dayTotals: false,
      meals: false,
      plannedMeals: false,
      water: false,
      customMetrics: false,
      evening: false,
    },
  })
  useWaterTrackingStore.setState({ enabled: false })
  usePlannedMealsTrackingStore.setState({ enabled: false })
  useNutritionFactsStore.setState({ enabled: false })
  resetSectionVisibility()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.customMetrics.clear()
  await db.customMetricEntries.clear()
  await db.plannedMeals.clear()
  localStorage.clear()
  usePlannedMealStore.setState({ plannedMeals: [], status: 'idle', error: null })
  useDailyReminderStore.setState({ enabled: false })
  useProfileStore.setState({ heightCm: undefined, age: undefined, sex: undefined })
  useDayStartStore.setState({ dayStartTime: '00:00', startedEarlyForDate: null })
  useTodayCardOrderStore.persist.clearStorage()
  useTodayCardOrderStore.setState({ order: DEFAULT_TODAY_CARD_ORDER })
  useTodaySectionsCollapseStore.persist.clearStorage()
  useTodaySectionsCollapseStore.setState({
    sections: {
      morning: false,
      stats: false,
      macros: false,
      dayTotals: false,
      meals: false,
      plannedMeals: false,
      water: false,
      customMetrics: false,
      evening: false,
    },
  })
  resetSectionVisibility()
  vi.useRealTimers()
})

// Merges every key back to true rather than a full literal (#232's own
// lesson from the Dashboard store) — stays correct as SectionKey grows.
function resetSectionVisibility() {
  useSectionVisibilityStore.setState((state) => ({
    visible: Object.fromEntries(
      Object.keys(state.visible).map((key) => [key, true]),
    ) as typeof state.visible,
  }))
}

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

// #200: renders the actual /-route, not just <TodayScreen /> alone — the
// bug this covers only shows up across a real remount at the same URL
// (e.g. a History deep-link or reload), not a re-render of one
// already-mounted instance.
function renderToday(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<TodayScreen />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  )
}

// #343 — DailyEntryForm's own Steps/Sleep input fields, rendered lower on
// this same page, reuse the identical `t.dailyEntry.stepsLabel`/
// `sleepLabel` text as the new StatCards — so a plain getByText('Steps')
// matches both. This picks specifically the one living inside a StatCard.
function findStatCardByLabel(text: string): HTMLElement {
  const card = screen
    .getAllByText(text)
    .map((el) => el.closest('[data-slot="card"]'))
    .find((el): el is HTMLElement => el !== null)
  if (!card) throw new Error(`No StatCard found for label "${text}"`)
  return card
}

describe('TodayScreen', () => {
  it('shows an empty state with a link to set a goal when none exists', async () => {
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No goal set yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Set a goal' })).toHaveAttribute(
      'href',
      '/goal',
    )
  })

  it("shows this week's target once a goal is active", async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText("This week's target")).toBeInTheDocument()
    // #527 — positive magnitude + "to lose" (not a leading minus).
    // #586 — formatExactNumber: whole numbers stay "1", not "1.0".
    expect(screen.getByText('1')).toBeInTheDocument()
    const card = screen
      .getByText("This week's target")
      .closest('[data-slot="card"]') as HTMLElement
    expect(within(card).getByText('kg to lose')).toBeInTheDocument()
  })

  it('shows a two-decimal weekly pace without rounding to one decimal (#586)', async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 0.28 }))

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    const card = (
      await screen.findByText("This week's target")
    ).closest('[data-slot="card"]') as HTMLElement
    expect(within(card).getByText('0.28')).toBeInTheDocument()
    expect(within(card).queryByText('0.3')).not.toBeInTheDocument()
  })

  // #469 — reported live: the target figure alone doesn't say which weight
  // it's relative to (it's actually a flat weekly-pace target, not derived
  // from any specific weight at all). Surfaces the goal window's own
  // baseline — the weight logged on `weekStart` itself — as that reference
  // point, same value #339's own "X → Y kg" status line already reads
  // (`goalWindowProgress().baselineWeightKg`).
  it("doesn't show a reference weight before the goal window's own weekStart weight is logged", async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText("This week's target")).toBeInTheDocument()
    expect(screen.queryByText(/from .* kg/)).not.toBeInTheDocument()
  })

  it("appends the weight logged on the goal's own weekStart to the weekly target's description (#469)", async () => {
    const weekStart = format(subDays(new Date(), 2), 'yyyy-MM-dd')
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 58.8 }))

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText("This week's target")).toBeInTheDocument()
    expect(
      await screen.findByText('from 58.8 kg', { exact: false }),
    ).toBeInTheDocument()
  })

  it('hides the weekly target card when the selected date is outside the goal window (#552)', async () => {
    await useGoalStore.getState().saveGoal(
      makeGoal({
        targetWeeklyLossKg: 0.1,
        weekStart: '2026-07-29',
      }),
    )

    render(
      <MemoryRouter initialEntries={['/?date=2019-09-26']}>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue('2019-09-26')).toBeInTheDocument()
    expect(screen.queryByText("This week's target")).not.toBeInTheDocument()
    expect(screen.queryByText(/Jul 29, 2026/)).not.toBeInTheDocument()
  })

  it('shows the weekly target card when the selected date falls in the goal window (#552)', async () => {
    await useGoalStore.getState().saveGoal(
      makeGoal({
        targetWeeklyLossKg: 0.1,
        weekStart: '2026-07-29',
      }),
    )

    render(
      <MemoryRouter initialEntries={['/?date=2026-08-01']}>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText("This week's target")).toBeInTheDocument()
    expect(screen.getByText(/Jul 29, 2026/)).toBeInTheDocument()
  })

  // #469 — reported live with a screenshot right after the first fix
  // shipped: it showed today's own weight (59.6 kg) instead of the weight
  // actually logged when the goal's week started 2 days earlier (58.8 kg).
  // A first attempt used the most recently logged weight across any past
  // day, which is wrong whenever that's a *different* day than weekStart —
  // exactly this scenario.
  it("shows the goal's own weekStart weight, not a later day's, when they differ", async () => {
    const weekStart = format(subDays(new Date(), 2), 'yyyy-MM-dd')
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))
    await db.dailyEntries.put(makeEntry({ date: weekStart, weightKg: 58.8 }))
    await useDailyEntryStore
      .getState()
      .saveEntry(makeEntry({ weightKg: 59.6 }))

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText("This week's target")).toBeInTheDocument()
    expect(
      await screen.findByText('from 58.8 kg', { exact: false }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/from 59\.6 kg/)).not.toBeInTheDocument()
  })

  it("shows the goal's own anchored 7-day window, not a calendar week (#135)", async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart: '2026-03-09' }))

    // #552 — card only renders for dates inside the goal window.
    render(
      <MemoryRouter initialEntries={['/?date=2026-03-12']}>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Mar 9, 2026 – Mar 15, 2026'),
    ).toBeInTheDocument()
  })

  it('defaults the date picker to today and shows a blank log form', async () => {
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Date')).toHaveValue(
      format(new Date(), 'yyyy-MM-dd'),
    )
    expect(
      await screen.findByRole('button', { name: 'Save weight' }),
    ).toBeInTheDocument()
  })

  it("logs today's weight and persists it independently", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    await user.type(await screen.findByLabelText('Weight (kg)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save weight' }))

    expect(
      await screen.findByRole('button', { name: 'Edit weight' }),
    ).toBeInTheDocument()
    const today = format(new Date(), 'yyyy-MM-dd')
    const persisted = await db.dailyEntries.where('date').equals(today).first()
    expect(persisted?.weightKg).toBe(80)
  })

  // #235: reported live as "no notification when logging today's weight,
  // only visible on the Goal page" — reproduces the exact flow (goal
  // already active, baseline day already logged, then a fresh live save of
  // today's weight that crosses the target) to check whether
  // GoalCelebrationModal actually reacts to that specific save, not just a
  // page load where the target was already met before mounting.
  it("shows the goal-celebration modal right after a live weight save crosses this week's target", async () => {
    const weekStart = format(subDays(new Date(), 2), 'yyyy-MM-dd')
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 0.1, weekStart }))
    await useDailyEntryStore
      .getState()
      .saveEntry(makeEntry({ date: weekStart, weightKg: 60 }))
    useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(
      screen.queryByText("You reached this week's target!"),
    ).not.toBeInTheDocument()

    await user.type(await screen.findByLabelText('Weight (kg)'), '59.8')
    await user.click(screen.getByRole('button', { name: 'Save weight' }))

    expect(
      await screen.findByText("You reached this week's target!"),
    ).toBeInTheDocument()

    // #235's own persistent complement to the modal above — stays visible
    // even after the modal is dismissed, unlike the one-time dialog.
    // #639: reframed to name when the badge is actually earned, rather
    // than claiming the target's already fully done.
    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(
      await screen.findByText(/keep it up through .* to earn your badge/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Review goal' }),
    ).toHaveAttribute('href', '/goal')
  })

  it('back-fills a past date without touching the current entry', async () => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    const dateInput = await screen.findByLabelText('Date')
    fireEvent.change(dateInput, { target: { value: yesterday } })

    await user.type(await screen.findByLabelText('Weight (kg)'), '81')
    await user.click(screen.getByRole('button', { name: 'Save weight' }))

    await screen.findByRole('button', { name: 'Edit weight' })

    const backfilled = await db.dailyEntries
      .where('date')
      .equals(yesterday)
      .first()
    expect(backfilled?.weightKg).toBe(81)

    const today = format(new Date(), 'yyyy-MM-dd')
    const todayEntry = await db.dailyEntries.where('date').equals(today).first()
    expect(todayEntry).toBeUndefined()
  })

  it('steps to the previous/next day via the arrow buttons', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    expect(await screen.findByLabelText('Date')).toHaveValue(today)

    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(await screen.findByLabelText('Date')).toHaveValue(yesterday)

    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect(await screen.findByLabelText('Date')).toHaveValue(today)
  })

  // #503 — day switches used to flip `entryStatus` to `'loading'`, which
  // replaced the whole form with a short "Loading…" line and collapsed
  // page height (browser clamp → scroll to top). Assert that prev-day
  // restores the captured scrollY after the new day is ready.
  it('restores window scroll position after changing day via prev (#503)', async () => {
    const user = userEvent.setup()
    let scrollY = 420
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => scrollY,
    })
    const scrollToSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(((...args: unknown[]) => {
        if (typeof args[0] === 'number') {
          scrollY = Number(args[1]) || 0
          return
        }
        const opts = args[0] as ScrollToOptions | undefined
        if (opts && typeof opts.top === 'number') scrollY = opts.top
      }) as typeof window.scrollTo)

    try {
      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const today = format(new Date(), 'yyyy-MM-dd')
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      expect(await screen.findByLabelText('Date')).toHaveValue(today)

      scrollY = 420
      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      expect(await screen.findByLabelText('Date')).toHaveValue(yesterday)

      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalledWith(0, 420)
      })
      expect(scrollY).toBe(420)
    } finally {
      scrollToSpy.mockRestore()
      Reflect.deleteProperty(window, 'scrollY')
    }
  })

  it('allows stepping one day past today by default, then disables the next-day arrow (#635)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    const today = format(new Date(), 'yyyy-MM-dd')
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    expect(await screen.findByLabelText('Date')).toHaveValue(today)
    expect(screen.getByRole('button', { name: 'Next day' })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next day' }))

    expect(await screen.findByLabelText('Date')).toHaveValue(tomorrow)
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
  })

  it('reaches a future date with a staged planned-meal draft past the default one-day cap, and shows its promote/discard UI (#635, #614)', async () => {
    usePlannedMealsTrackingStore.setState({ enabled: true })
    const user = userEvent.setup()
    const dayAfterTomorrow = format(addDays(new Date(), 2), 'yyyy-MM-dd')
    await usePlannedMealStore
      .getState()
      .addPlannedMeal(dayAfterTomorrow, 'Leftover chili')

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    await screen.findByLabelText('Date')
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect(
      await screen.findByRole('button', { name: 'Next day' }),
    ).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next day' }))

    expect(await screen.findByLabelText('Date')).toHaveValue(dayAfterTomorrow)
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
    expect(await screen.findByText('Leftover chili')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add to log' }),
    ).toBeInTheDocument()
  })

  it('loads an existing entry for editing when picking a date that already has one', async () => {
    await useDailyEntryStore.getState().saveEntry(
      makeEntry({
        weightKg: 79.5,
        calorieEntries: [
          {
            id: crypto.randomUUID(),
            items: [{ id: crypto.randomUUID(), amountKcal: 1900 }],
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    )
    useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText('79.5')).toBeInTheDocument()
    // #326 — DailyEntryForm no longer has its own standalone calories
    // readout; the loaded meal itself is the thing to check for now.
    // #473 — the meal card's header is the label alone now; its total moved
    // onto the calorie/macros line below it.
    expect(screen.getByText('Breakfast')).toBeInTheDocument()
    expect(screen.getAllByText(/1,900 kcal/).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', { name: 'Edit weight' }),
    ).toBeInTheDocument()
  })

  describe('goal renewal reminder (#135: anchored to goal.weekStart, not a calendar week)', () => {
    it("shows once the goal's 7-day window has run its course", async () => {
      const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd') // weekEnd yesterday
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByText(/ready to renew/),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Review goal' })).toHaveAttribute(
        'href',
        '/goal',
      )
    })

    // #662 — this and the target-met banner/renew button all previously used
    // slightly different boundaries for "the window is over" (this card said
    // so a day early, on weekEnd itself), so a user could see "hold on until
    // Aug 9" and "time to renew" at once, with the renew button still
    // disabled. All three now agree: the window isn't over until the day
    // after weekEnd.
    it("does not show on the window's exact last day, only the day after", async () => {
      const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd') // weekEnd == today
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText("This week's target")
      expect(screen.queryByText(/ready to renew/)).not.toBeInTheDocument()
    })

    it('keeps showing on later visits if the window is overdue, not just its exact last day', async () => {
      const weekStart = format(subDays(new Date(), 10), 'yyyy-MM-dd') // weekEnd 4 days ago
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(await screen.findByText(/ready to renew/)).toBeInTheDocument()
    })

    it('does not show before the window is complete', async () => {
      const weekStart = format(subDays(new Date(), 5), 'yyyy-MM-dd') // weekEnd tomorrow
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText("This week's target")
      expect(screen.queryByText(/ready to renew/)).not.toBeInTheDocument()
    })

    it('does not show when there is no goal, even with a stale window', async () => {
      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('No goal set yet')
      expect(screen.queryByText(/ready to renew/)).not.toBeInTheDocument()
    })
  })

  describe('daily reminder (#171)', () => {
    const REMINDER_TEXT = 'No entry yet today'

    it('does not show by default, even with nothing logged today', async () => {
      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('No goal set yet')
      expect(screen.queryByText(REMINDER_TEXT, { exact: false })).not.toBeInTheDocument()
    })

    it('shows once enabled, when nothing has been logged today', async () => {
      useDailyReminderStore.setState({ enabled: true })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByText(REMINDER_TEXT, { exact: false }),
      ).toBeInTheDocument()
    })

    it('does not show once an entry exists for today', async () => {
      useDailyReminderStore.setState({ enabled: true })
      await db.dailyEntries.put(makeEntry())

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('No goal set yet')
      expect(
        screen.queryByText(REMINDER_TEXT, { exact: false }),
      ).not.toBeInTheDocument()
    })

    it('does not show while viewing a past day, even if enabled', async () => {
      useDailyReminderStore.setState({ enabled: true })
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )
      await screen.findByText(REMINDER_TEXT, { exact: false })

      await user.click(screen.getByRole('button', { name: 'Previous day' }))

      expect(
        screen.queryByText(REMINDER_TEXT, { exact: false }),
      ).not.toBeInTheDocument()
    })
  })

  describe('nutrition facts (#663)', () => {
    async function saveHighProteinMeal() {
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [
                { id: crypto.randomUUID(), amountKcal: 200, proteinG: 25 },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })
    }

    it('shows a satisfied fact by default once a qualifying meal is logged', async () => {
      useNutritionFactsStore.setState({ enabled: true })
      await saveHighProteinMeal()

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByText('Protein-rich meal', { exact: false }),
      ).toBeInTheDocument()
    })

    it('does not show once disabled, even with a qualifying meal logged', async () => {
      useNutritionFactsStore.setState({ enabled: false })
      await saveHighProteinMeal()

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('No goal set yet')
      expect(
        screen.queryByText('Protein-rich meal', { exact: false }),
      ).not.toBeInTheDocument()
    })

    it('does not show with nothing qualifying logged', async () => {
      useNutritionFactsStore.setState({ enabled: true })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('No goal set yet')
      expect(
        screen.queryByText('Protein-rich meal', { exact: false }),
      ).not.toBeInTheDocument()
    })
  })

  describe('delta vs yesterday', () => {
    it('shows the delta once both today and yesterday have a logged weight', async () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      await db.dailyEntries.put(makeEntry({ date: yesterday, weightKg: 80.5 }))
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ weightKg: 80.0 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      // Scoped to this card — the #100 max-weight card can coincidentally
      // show the same delta text (both derived from the same two entries).
      const label = await screen.findByText('vs. yesterday')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(within(card).getByText('-0.5')).toBeInTheDocument()
    })

    it('renders a loss bold, with the minus sign', async () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      await db.dailyEntries.put(makeEntry({ date: yesterday, weightKg: 80.5 }))
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ weightKg: 80.0 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('vs. yesterday')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      const value = within(card).getByText('-0.5')
      expect(value).toHaveClass('text-4xl', 'font-semibold')
    })

    it('renders a gain quietly, with no explicit plus sign', async () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      await db.dailyEntries.put(makeEntry({ date: yesterday, weightKg: 80.0 }))
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ weightKg: 80.6 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const value = await screen.findByText('0.6')
      expect(screen.queryByText('+0.6')).not.toBeInTheDocument()
      expect(value).toHaveClass(
        'text-2xl',
        'font-normal',
        'text-muted-foreground',
      )
    })

    it('does not show the delta when yesterday has no logged weight', async () => {
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ weightKg: 80.0 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      // #516 — Weight value and unit are separate nodes now.
      await screen.findByText('80')
      expect(screen.queryByText('vs. yesterday')).not.toBeInTheDocument()
    })
  })

  describe('delta vs highest recorded weight (#100)', () => {
    it('shows the delta once a higher weight exists in history', async () => {
      const lastMonth = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      await db.dailyEntries.put(makeEntry({ date: lastMonth, weightKg: 85 }))
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ weightKg: 80 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByText('vs. highest weight'),
      ).toBeInTheDocument()
      expect(screen.getByText('-5')).toBeInTheDocument()
    })

    it('renders progress below the highest weight bold', async () => {
      const lastMonth = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      await db.dailyEntries.put(makeEntry({ date: lastMonth, weightKg: 85 }))
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ weightKg: 80 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const value = await screen.findByText('-5')
      expect(value).toHaveClass('text-4xl', 'font-semibold')
    })

    it('renders being at the highest weight quietly', async () => {
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ weightKg: 80 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      // Scoped to the card itself — an untouched Calories total also
      // renders a bare "0" elsewhere on the page.
      const label = await screen.findByText('vs. highest weight')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      const value = within(card).getByText('0')
      expect(value).toHaveClass(
        'text-2xl',
        'font-normal',
        'text-muted-foreground',
      )
    })

    it('does not show the delta when no weight is logged for the viewed date', async () => {
      const lastMonth = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      await db.dailyEntries.put(makeEntry({ date: lastMonth, weightKg: 85 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByLabelText('Date')
      expect(
        screen.queryByText('vs. highest weight'),
      ).not.toBeInTheDocument()
    })
  })

  describe('BMI/BMR (#233, tooltip move #329)', () => {
    it('shows neither BMI nor a BMR tooltip trigger with no profile data logged', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 80 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining calories')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(screen.queryByText('BMI')).not.toBeInTheDocument()
      expect(
        within(card).queryByRole('button', {
          name: 'About estimated daily calories',
        }),
      ).not.toBeInTheDocument()
    })

    it('shows BMI once height and a logged weight exist, without a BMR tooltip trigger (needs age/sex too)', async () => {
      useProfileStore.setState({ heightCm: 165 })
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 70 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(await screen.findByText('BMI')).toBeInTheDocument()
      expect(screen.getByText('25.7')).toBeInTheDocument()
      const label = await screen.findByText('Remaining calories')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(
        within(card).queryByRole('button', {
          name: 'About estimated daily calories',
        }),
      ).not.toBeInTheDocument()
    })

    it('shows a BMR tooltip trigger on the Remaining calories card once height, age, and sex are all set, revealing the value on click (#329)', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({ heightCm: 165, age: 30, sex: 'female' })
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 70 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining calories')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      const trigger = await within(card).findByRole('button', {
        name: 'About estimated daily calories',
      })
      // Not its own card any more — no separate "Estimated daily calories
      // (BMR)" heading rendered outside the tooltip's (closed) popover.
      expect(
        screen.queryByText('Estimated daily calories (BMR)'),
      ).not.toBeInTheDocument()

      await user.click(trigger)

      expect(
        await screen.findByText('Estimated daily calories (BMR): 1,420 kcal/day'),
      ).toBeInTheDocument()
    })
  })

  describe('stats accordion (#418)', () => {
    it('is expanded by default, showing BMI and the reorderable card group', async () => {
      useProfileStore.setState({ heightCm: 165 })
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 70 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByRole('button', { name: 'Hide stats' }),
      ).toBeInTheDocument()
      expect(screen.getByText('BMI')).toBeInTheDocument()
      expect(screen.getByText('Remaining calories')).toBeInTheDocument()
    })

    it('collapses BMI and the reorderable card group on click, persisting the choice', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({ heightCm: 165 })
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 70 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('BMI')
      await user.click(screen.getByRole('button', { name: 'Hide stats' }))

      expect(screen.queryByText('BMI')).not.toBeInTheDocument()
      expect(screen.queryByText('Remaining calories')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Show stats' }),
      ).toBeInTheDocument()
      expect(useTodaySectionsCollapseStore.getState().sections.stats).toBe(
        true,
      )
    })

    it('collapses every top-level section via Collapse all, then expands them via Expand all (#511)', async () => {
      const user = userEvent.setup()
      await useGoalStore.getState().saveGoal(makeGoal())
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 70 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByRole('button', { name: 'Collapse all' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Hide stats' }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Collapse all' }))

      expect(
        screen.getByRole('button', { name: 'Expand all' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Show stats' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', {
          name: 'Show morning entries',
        }),
      ).toBeInTheDocument()
      expect(
        useTodaySectionsCollapseStore.getState().sections.morning,
      ).toBe(true)
      expect(useTodaySectionsCollapseStore.getState().sections.stats).toBe(
        true,
      )
      expect(useTodaySectionsCollapseStore.getState().sections.meals).toBe(
        true,
      )
      expect(useTodaySectionsCollapseStore.getState().sections.evening).toBe(
        true,
      )

      await user.click(screen.getByRole('button', { name: 'Expand all' }))

      expect(
        screen.getByRole('button', { name: 'Collapse all' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Hide stats' }),
      ).toBeInTheDocument()
      expect(useTodaySectionsCollapseStore.getState().sections.stats).toBe(
        false,
      )
    })

    it('does not affect the Goal target card or Morning entries, which stay outside the accordion', async () => {
      const user = userEvent.setup()
      useProfileStore.setState({ heightCm: 165 })
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 70 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('BMI')
      await user.click(screen.getByRole('button', { name: 'Hide stats' }))

      expect(screen.getByText("This week's target")).toBeInTheDocument()
      // #516 — Morning Weight value is its own node (unit is separate).
      expect(screen.getByText('70')).toBeInTheDocument()
    })
  })

  describe('remaining calories (#208)', () => {
    it('does not show when the active goal has no daily calorie target', async () => {
      await useGoalStore.getState().saveGoal(makeGoal())

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText("This week's target")
      expect(
        screen.queryByText('Remaining calories'),
      ).not.toBeInTheDocument()
    })

    it('shows the remaining amount plus a total-minus-consumed breakdown, treating nothing logged as 0 consumed (#326, #328)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining calories')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(within(card).getByText('2,000')).toBeInTheDocument()
      expect(within(card).getByText('kcal remaining')).toBeInTheDocument()
      expect(within(card).getByText('2,000 kcal − 0 kcal')).toBeInTheDocument()
    })

    it('subtracts what was actually logged today, showing it in the breakdown (#326, #328)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [{ id: crypto.randomUUID(), amountKcal: 1500 }],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining calories')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      // Flaky under full-suite load (caught live in CI, #240 session): the
      // "Remaining calories" label renders as soon as the goal loads,
      // independent of whether the separately-async entry load has
      // resolved yet, so the card can briefly show the stale
      // nothing-logged value (2,000 remaining) before re-rendering with
      // the real one. findByText (polls) instead of getByText
      // (synchronous) waits out that second render instead of racing it.
      expect(await within(card).findByText('500')).toBeInTheDocument()
      expect(within(card).getByText('kcal remaining')).toBeInTheDocument()
      expect(
        within(card).getByText('2,000 kcal − 1,500 kcal'),
      ).toBeInTheDocument()
    })

    it('reads as "over" once logged calories exceed the target (#326)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 1000 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [{ id: crypto.randomUUID(), amountKcal: 1300 }],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining calories')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      // The absolute difference, not a negative number — "over" carries
      // the direction instead. findByText (not getByText) for the same
      // reason as the sibling test above — races the entry's own async
      // load otherwise.
      expect(await within(card).findByText('300')).toBeInTheDocument()
      expect(within(card).getByText('kcal over')).toBeInTheDocument()
      expect(
        within(card).getByText('1,000 kcal − 1,300 kcal'),
      ).toBeInTheDocument()
    })

    it('sizes the progress bar to percent of target consumed (#323)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [{ id: crypto.randomUUID(), amountKcal: 500 }],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining calories')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      const bar = await within(card).findByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '25')
    })
  })

  describe('remaining protein (#220)', () => {
    it('does not show when the active goal has no daily protein target', async () => {
      await useGoalStore.getState().saveGoal(makeGoal())

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText("This week's target")
      expect(
        screen.queryByText('Remaining protein'),
      ).not.toBeInTheDocument()
    })

    it('shows what remains once a target is set, treating nothing logged as 0 consumed', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyProteinTargetG: 120 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByText('Remaining protein'),
      ).toBeInTheDocument()
      expect(screen.getByText('120')).toBeInTheDocument()
      expect(screen.getByText('g remaining')).toBeInTheDocument()
      expect(screen.getByText('120g − 0g')).toBeInTheDocument()
    })

    it('subtracts what was actually logged today', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyProteinTargetG: 120 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [
                { id: crypto.randomUUID(), amountKcal: 400, proteinG: 90 },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining protein')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      // findByText, not getByText — same goal-loads-before-entry race as
      // the "remaining calories" tests above.
      expect(await within(card).findByText('30')).toBeInTheDocument()
      expect(within(card).getByText('g remaining')).toBeInTheDocument()
      expect(within(card).getByText('120g − 90g')).toBeInTheDocument()
    })

    // #266: reverses the old "clamps at 0" behavior — exceeding a protein
    // target is a good outcome, not a "went over budget" one, so it now
    // gets a positive surplus message instead of a flat "0g remaining".
    it('shows a positive surplus message once the target is exceeded, instead of clamping at 0', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyProteinTargetG: 100 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [
                { id: crypto.randomUUID(), amountKcal: 600, proteinG: 130 },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining protein')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      // findByText, not getByText — same goal-loads-before-entry race as
      // the "remaining calories" tests above.
      expect(await within(card).findByText('30')).toBeInTheDocument()
      expect(within(card).getByText('g over')).toBeInTheDocument()
      expect(
        within(card).getByText('100g − 130g — great job!'),
      ).toBeInTheDocument()
    })

    it('sizes the progress bar to percent of target consumed (#320)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyProteinTargetG: 100 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [
                { id: crypto.randomUUID(), amountKcal: 200, proteinG: 40 },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining protein')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      const bar = await within(card).findByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '40')
    })
  })

  describe('remaining fat/carbs (#252)', () => {
    it('does not show either card when the active goal has no fat/carb targets', async () => {
      await useGoalStore.getState().saveGoal(makeGoal())

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText("This week's target")
      expect(screen.queryByText('Remaining fat')).not.toBeInTheDocument()
      expect(screen.queryByText('Remaining carbs')).not.toBeInTheDocument()
    })

    it('shows what remains once targets are set, treating nothing logged as 0 consumed', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyFatTargetG: 60, dailyCarbTargetG: 200 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(await screen.findByText('Remaining fat')).toBeInTheDocument()
      expect(screen.getByText('60')).toBeInTheDocument()
      expect(screen.getByText('60g − 0g')).toBeInTheDocument()
      expect(await screen.findByText('Remaining carbs')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('200g − 0g')).toBeInTheDocument()
    })

    it('subtracts what was actually logged today, independently for each macro', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyFatTargetG: 60, dailyCarbTargetG: 200 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [
                {
                  id: crypto.randomUUID(),
                  amountKcal: 400,
                  fatG: 20,
                  carbsG: 50,
                },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const fatLabel = await screen.findByText('Remaining fat')
      const fatCard = fatLabel.closest('[data-slot="card"]') as HTMLElement
      expect(await within(fatCard).findByText('40')).toBeInTheDocument()

      const carbLabel = await screen.findByText('Remaining carbs')
      const carbCard = carbLabel.closest('[data-slot="card"]') as HTMLElement
      expect(await within(carbCard).findByText('150')).toBeInTheDocument()
    })

    it('shows the overage amount instead of clamping at 0 once a target is exceeded (#321)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyFatTargetG: 50 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [{ id: crypto.randomUUID(), amountKcal: 700, fatG: 80 }],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining fat')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(await within(card).findByText('30')).toBeInTheDocument()
      expect(within(card).getByText('g over')).toBeInTheDocument()
      // Neutral breakdown, not protein's positive "great job!" framing.
      expect(within(card).getByText('50g − 80g')).toBeInTheDocument()
    })

    it('shows the carbs overage amount too, independently of fat (#321)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCarbTargetG: 100 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [
                { id: crypto.randomUUID(), amountKcal: 700, carbsG: 130 },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining carbs')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(await within(card).findByText('30')).toBeInTheDocument()
      expect(within(card).getByText('g over')).toBeInTheDocument()
      expect(within(card).getByText('100g − 130g')).toBeInTheDocument()
    })

    // #341 — same neutral over-target shape as fat/carbs above, not
    // protein's positive "great job!" framing.
    it('shows a remaining-fiber card, independently of the other macros', async () => {
      await useGoalStore.getState().saveGoal(makeGoal({ dailyFiberTargetG: 25 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [{ id: crypto.randomUUID(), amountKcal: 700, fiberG: 10 }],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining fiber')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(await within(card).findByText('15')).toBeInTheDocument()
      expect(within(card).getByText('25g − 10g')).toBeInTheDocument()
    })
  })

  describe('remaining water (#258)', () => {
    it('does not show when the active goal has no water target', async () => {
      await useGoalStore.getState().saveGoal(makeGoal())

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText("This week's target")
      expect(screen.queryByText('Remaining water')).not.toBeInTheDocument()
    })

    it('shows what remains once a target is set, treating nothing logged as 0 consumed', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyWaterTargetMl: 2000 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(await screen.findByText('Remaining water')).toBeInTheDocument()
      expect(screen.getByText('2,000')).toBeInTheDocument()
      expect(screen.getByText('ml remaining')).toBeInTheDocument()
      // #328 — water gets a total-minus-consumed breakdown too, which it
      // didn't have at all before (unlike protein/fat/carb's old "of Xg").
      expect(screen.getByText('2,000ml − 0ml')).toBeInTheDocument()
    })

    it('subtracts what was actually logged today, showing it in the breakdown (#328)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyWaterTargetMl: 2000 }))
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ waterEntries: [{ id: 'w1', amountMl: 750 }] }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining water')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(await within(card).findByText('1,250')).toBeInTheDocument()
      expect(within(card).getByText('2,000ml − 750ml')).toBeInTheDocument()
    })

    it('shows the overage amount instead of clamping at 0 once the target is exceeded (#321)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyWaterTargetMl: 2000 }))
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ waterEntries: [{ id: 'w1', amountMl: 2500 }] }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining water')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      expect(await within(card).findByText('500')).toBeInTheDocument()
      expect(within(card).getByText('ml over')).toBeInTheDocument()
    })

    it('clamps the progress bar at 100 once over the water target (#320)', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyWaterTargetMl: 2000 }))
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ waterEntries: [{ id: 'w1', amountMl: 2500 }] }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const label = await screen.findByText('Remaining water')
      const card = label.closest('[data-slot="card"]') as HTMLElement
      const bar = await within(card).findByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '100')
    })

    describe('Planned meals (#626)', () => {
      it('does not show Planned meals by default', async () => {
        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        await screen.findByLabelText('Date')
        expect(screen.queryByText('Planned meals')).not.toBeInTheDocument()
      })

      it('shows Planned meals once the Settings toggle is on', async () => {
        usePlannedMealsTrackingStore.setState({ enabled: true })

        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        expect(await screen.findByText('Planned meals')).toBeInTheDocument()
      })
    })

    describe('click-to-scroll (#430)', () => {
      beforeEach(() => {
        useWaterTrackingStore.setState({ enabled: true })
        // jsdom doesn't implement scrollIntoView at all.
        Element.prototype.scrollIntoView = vi.fn()
      })

      afterEach(() => {
        // @ts-expect-error — undo the jsdom polyfill above, don't leak it
        // into other test files sharing this prototype.
        delete Element.prototype.scrollIntoView
      })

      it('scrolls to the water add/remove section when the card itself is clicked', async () => {
        const user = userEvent.setup()
        await useGoalStore
          .getState()
          .saveGoal(makeGoal({ dailyWaterTargetMl: 2000 }))

        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        const label = await screen.findByText('Remaining water')
        const card = label.closest('[data-slot="card"]') as HTMLElement
        await user.click(card)

        const waterSection = document.getElementById('water-entry-section')
        expect(waterSection?.scrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'start',
        })
      })

      it('does not scroll when clicking the card\'s own hide-section toggle (propagation regression)', async () => {
        const user = userEvent.setup()
        await useGoalStore
          .getState()
          .saveGoal(makeGoal({ dailyWaterTargetMl: 2000 }))

        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        const label = await screen.findByText('Remaining water')
        const card = label.closest('[data-slot="card"]') as HTMLElement
        await user.click(within(card).getByRole('button', { name: 'Hide Remaining water' }))

        const waterSection = document.getElementById('water-entry-section')
        expect(waterSection?.scrollIntoView).not.toHaveBeenCalled()
      })
    })
  })

  describe('viewed date lives in the URL, not local state (#200)', () => {
    it('encodes a non-today date into the URL when navigating via the arrows', async () => {
      const user = userEvent.setup()
      renderToday()
      await screen.findByLabelText('Date')

      await user.click(screen.getByRole('button', { name: 'Previous day' }))

      expect(screen.getByTestId('location')).toHaveTextContent(
        /\?date=\d{4}-\d{2}-\d{2}/,
      )
    })

    it('omits the search param once navigated back to today', async () => {
      const user = userEvent.setup()
      renderToday()
      await screen.findByLabelText('Date')

      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      await user.click(screen.getByRole('button', { name: 'Next day' }))

      expect(screen.getByTestId('location')).toHaveTextContent('/')
      expect(screen.getByTestId('location')).not.toHaveTextContent('?date=')
    })

    it('restores a previously-viewed date from the URL after a fresh mount, instead of resetting to today', async () => {
      // Simulates a remount at the same URL (#200): TodayScreen fully
      // remounts at the URL it was left at, rather than re-rendering in
      // place — e.g. a reload or History deep-link with ?date=.
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      renderToday([`/?date=${yesterday}`])

      expect(await screen.findByLabelText('Date')).toHaveValue(yesterday)
    })
  })

  describe('checkmark on the date navigator when the day has entries (#405)', () => {
    it('shows no checkmark for a day with no logged entry', async () => {
      renderToday()
      await screen.findByLabelText('Date')

      expect(
        screen.queryByRole('button', { name: 'This day has logged entries' }),
      ).not.toBeInTheDocument()
    })

    it('shows a checkmark once the viewed day has a logged entry', async () => {
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ date: '2026-03-01', weightKg: 60 }))
      renderToday(['/?date=2026-03-01'])
      await screen.findByLabelText('Date')

      expect(
        await screen.findByRole('button', {
          name: 'This day has logged entries',
        }),
      ).toBeInTheDocument()
    })

    it('shows an explanatory tooltip when the checkmark is clicked (#422)', async () => {
      const user = userEvent.setup()
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ date: '2026-03-01', weightKg: 60 }))
      renderToday(['/?date=2026-03-01'])
      await screen.findByLabelText('Date')

      await user.click(
        screen.getByRole('button', { name: 'This day has logged entries' }),
      )

      expect(
        await screen.findByText('This day has logged entries'),
      ).toBeInTheDocument()
    })
  })

  describe('quick jump back to today (#403)', () => {
    it('has no Today button while already viewing today', async () => {
      renderToday()
      await screen.findByLabelText('Date')

      expect(
        screen.queryByRole('button', { name: 'Today' }),
      ).not.toBeInTheDocument()
    })

    it('shows a Today button once viewing a non-today date, which jumps straight back', async () => {
      const user = userEvent.setup()
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      const today = format(new Date(), 'yyyy-MM-dd')
      renderToday([`/?date=${yesterday}`])
      expect(await screen.findByLabelText('Date')).toHaveValue(yesterday)

      await user.click(screen.getByRole('button', { name: 'Today' }))

      expect(await screen.findByLabelText('Date')).toHaveValue(today)
      expect(
        screen.queryByRole('button', { name: 'Today' }),
      ).not.toBeInTheDocument()
    })

    it('renders at the same height as the arrows/Date input it shares a row with (#420)', async () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      renderToday([`/?date=${yesterday}`])
      await screen.findByLabelText('Date')

      expect(screen.getByRole('button', { name: 'Today' })).toHaveClass(
        'h-[2.625rem]',
      )
    })
  })

  describe('dismissible insight sections (#232)', () => {
    it('hides a StatCard-based section but keeps its label and toggle visible, via the toggle slotted into the card itself', async () => {
      const user = userEvent.setup()
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyProteinTargetG: 100 }))
      await useDailyEntryStore.getState().saveEntry(
        makeEntry({
          calorieEntries: [
            {
              id: crypto.randomUUID(),
              items: [
                { id: crypto.randomUUID(), amountKcal: 300, proteinG: 30 },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      )
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('Remaining protein')
      const hideButton = screen.getByRole('button', {
        name: 'Hide Remaining protein',
      })
      await user.click(hideButton)

      expect(screen.queryByText('70')).not.toBeInTheDocument()
      expect(screen.getByText('Remaining protein')).toBeInTheDocument()
      const showButton = screen.getByRole('button', {
        name: 'Show Remaining protein',
      })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(await screen.findByText('70')).toBeInTheDocument()
    })

    it('hides a banner-based section but keeps its title and toggle visible', async () => {
      const user = userEvent.setup()
      useDailyReminderStore.setState({ enabled: true })
      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('Daily reminder')
      expect(
        screen.getByText('No entry yet today — whenever you’re ready.'),
      ).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Hide Daily reminder' }),
      )

      expect(
        screen.queryByText('No entry yet today — whenever you’re ready.'),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Daily reminder')).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Show Daily reminder' }),
      )
      expect(
        screen.getByText('No entry yet today — whenever you’re ready.'),
      ).toBeInTheDocument()
    })

    it('does not show the same label twice once a StatCard section is toggled back on', async () => {
      const user = userEvent.setup()
      await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText("This week's target")
      await user.click(
        screen.getByRole('button', { name: "Hide This week's target" }),
      )
      await user.click(
        screen.getByRole('button', { name: "Show This week's target" }),
      )

      expect(screen.getAllByText("This week's target")).toHaveLength(1)
    })
  })

  describe('day-start time (#298)', () => {
    it('defaults to the previous day when now is before the configured day-start time', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-24T01:30:00'))
      useDayStartStore.setState({ dayStartTime: '03:00' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(screen.getByLabelText('Date')).toHaveValue('2026-07-23')
    })

    it('uses the real calendar day once at or after the configured day-start time', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-24T03:00:00'))
      useDayStartStore.setState({ dayStartTime: '03:00' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(screen.getByLabelText('Date')).toHaveValue('2026-07-24')
    })

    it('is unaffected by default (midnight), matching the pre-#298 behavior exactly', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-24T00:01:00'))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(screen.getByLabelText('Date')).toHaveValue('2026-07-24')
    })

    // #345 — a per-occasion way to cross the configured boundary early,
    // without touching the dayStartTime setting itself.
    describe('starting today early (#345)', () => {
      it('offers to start today\'s log early once the real calendar day has turned over', () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-07-24T01:30:00'))
        useDayStartStore.setState({ dayStartTime: '03:00' })

        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        expect(screen.getByText("It's already a new day.")).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: "Start today's log now" }),
        ).toBeInTheDocument()
      })

      it('jumps to the real calendar day once clicked', async () => {
        const user = userEvent.setup({ delay: null })
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-07-24T01:30:00'))
        useDayStartStore.setState({ dayStartTime: '03:00' })

        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        await user.click(
          screen.getByRole('button', { name: "Start today's log now" }),
        )

        expect(screen.getByLabelText('Date')).toHaveValue('2026-07-24')
        expect(
          screen.queryByText("It's already a new day."),
        ).not.toBeInTheDocument()
      })

      it('keeps Сегодня on the early-started day after browsing away (#539)', async () => {
        const user = userEvent.setup({ delay: null })
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-07-24T01:30:00'))
        useDayStartStore.setState({
          dayStartTime: '03:00',
          startedEarlyForDate: null,
        })

        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        await user.click(
          screen.getByRole('button', { name: "Start today's log now" }),
        )
        expect(screen.getByLabelText('Date')).toHaveValue('2026-07-24')

        await user.click(screen.getByRole('button', { name: 'Previous day' }))
        expect(screen.getByLabelText('Date')).toHaveValue('2026-07-23')

        await user.click(screen.getByRole('button', { name: 'Today' }))
        expect(screen.getByLabelText('Date')).toHaveValue('2026-07-24')
        expect(useDayStartStore.getState().startedEarlyForDate).toBe(
          '2026-07-24',
        )
      })

      it('does not offer it once the real day matches the effective day', () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-07-24T03:00:00'))
        useDayStartStore.setState({ dayStartTime: '03:00' })

        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        expect(
          screen.queryByText("It's already a new day."),
        ).not.toBeInTheDocument()
      })

      it('does not offer it while browsing an earlier day', () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-07-24T01:30:00'))
        useDayStartStore.setState({ dayStartTime: '03:00' })

        render(
          <MemoryRouter>
            <TodayScreen />
          </MemoryRouter>,
        )

        fireEvent.change(screen.getByLabelText('Date'), {
          target: { value: '2026-07-20' },
        })

        expect(
          screen.queryByText("It's already a new day."),
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('Steps and Sleep cards (#343)', () => {
    it('shows Steps and Sleep cards when logged', async () => {
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ steps: 8432, sleepHours: 7.5 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      // "Reorder" only renders once at least one card exists (see the
      // reordering describe block below) — a reliable, unambiguous
      // readiness signal, unlike "8,432"/"Steps", which also match
      // DailyEntryForm's own read-only steps display further down the page.
      await screen.findByRole('button', { name: 'Reorder' })
      const stepsCard = findStatCardByLabel('Steps')
      expect(within(stepsCard).getByText('8,432')).toBeInTheDocument()

      // #358 — shown as hours+minutes ("7h 30m"), not decimal ("7.5h").
      const sleepCard = findStatCardByLabel('Sleep')
      expect(within(sleepCard).getByText('7h 30m')).toBeInTheDocument()
    })

    // #353 — reported live right after validating #343: deep sleep is
    // already logged (DailyEntryForm's own Sleep field) but never surfaced
    // on this card, even though the total is.
    it('shows deep sleep as the Sleep card description when logged', async () => {
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ sleepHours: 7.5, deepSleepHours: 2.3 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByRole('button', { name: 'Reorder' })
      const sleepCard = findStatCardByLabel('Sleep')
      expect(within(sleepCard).getByText('2h 18m deep sleep')).toBeInTheDocument()
    })

    it('omits the deep sleep description when only the total was logged', async () => {
      await useDailyEntryStore.getState().saveEntry(makeEntry({ sleepHours: 7.5 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByRole('button', { name: 'Reorder' })
      expect(screen.queryByText(/deep sleep/)).not.toBeInTheDocument()
    })

    it('omits Steps/Sleep cards when neither was logged', async () => {
      await useDailyEntryStore.getState().saveEntry(makeEntry())
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByLabelText('Date')
      expect(
        screen
          .getAllByText('Steps')
          .every((el) => !el.closest('[data-slot="card"]')),
      ).toBe(true)
      expect(
        screen
          .getAllByText('Sleep')
          .every((el) => !el.closest('[data-slot="card"]')),
      ).toBe(true)
    })

    it('hides the Steps card via its own toggle, keeping Sleep visible', async () => {
      const user = userEvent.setup()
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ steps: 8432, sleepHours: 7.5 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByRole('button', { name: 'Reorder' })
      await user.click(screen.getByRole('button', { name: 'Hide Steps' }))

      // The StatCard is gone (collapsed to a plain section title) — only
      // DailyEntryForm's own unrelated "Steps" label/input remains.
      expect(
        screen
          .getAllByText('Steps')
          .every((el) => !el.closest('[data-slot="card"]')),
      ).toBe(true)
      expect(
        within(findStatCardByLabel('Sleep')).getByText('7h 30m'),
      ).toBeInTheDocument()
    })
  })

  describe('reordering the summary cards (#343)', () => {
    it('shows a Reorder button that toggles to Save, only while there is at least one card', async () => {
      const user = userEvent.setup()
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ steps: 8432 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const reorderButton = await screen.findByRole('button', {
        name: 'Reorder',
      })
      await user.click(reorderButton)
      expect(
        screen.getByRole('button', { name: 'Save' }),
      ).toBeInTheDocument()
    })

    it('persists a new order and re-renders cards in that order', async () => {
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ steps: 8432, sleepHours: 7.5 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByRole('button', { name: 'Reorder' })
      const stepsCardBefore = findStatCardByLabel('Steps')
      const sleepCardBefore = findStatCardByLabel('Sleep')
      expect(
        !!(
          stepsCardBefore.compareDocumentPosition(sleepCardBefore) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      ).toBe(true)

      act(() => {
        capturedOnCardDragEnd?.({ active: { id: 'sleep' }, over: { id: 'steps' } })
      })

      expect(useTodayCardOrderStore.getState().order.indexOf('sleep')).toBeLessThan(
        useTodayCardOrderStore.getState().order.indexOf('steps'),
      )
      const stepsCardAfter = findStatCardByLabel('Steps')
      const sleepCardAfter = findStatCardByLabel('Sleep')
      expect(
        !!(
          sleepCardAfter.compareDocumentPosition(stepsCardAfter) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      ).toBe(true)
    })

    it('does not reorder when a drag ends over itself or nothing', async () => {
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ steps: 8432, sleepHours: 7.5 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )
      await screen.findByRole('button', { name: 'Reorder' })

      act(() => {
        capturedOnCardDragEnd?.({ active: { id: 'steps' }, over: { id: 'steps' } })
        capturedOnCardDragEnd?.({ active: { id: 'steps' }, over: null })
      })

      expect(useTodayCardOrderStore.getState().order).toEqual(
        DEFAULT_TODAY_CARD_ORDER,
      )
    })

    // #356 — reported live: no way back to the original order short of
    // manually re-dragging every card.
    it('only shows the Reset order button while reordering', async () => {
      const user = userEvent.setup()
      await useDailyEntryStore.getState().saveEntry(makeEntry({ steps: 8432 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByRole('button', { name: 'Reorder' })
      expect(
        screen.queryByRole('button', { name: 'Reset order' }),
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Reorder' }))

      expect(
        screen.getByRole('button', { name: 'Reset order' }),
      ).toBeInTheDocument()
    })

    it('restores the default card order', async () => {
      const user = userEvent.setup()
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ steps: 8432, sleepHours: 7.5 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })
      useTodayCardOrderStore.setState({
        order: [...DEFAULT_TODAY_CARD_ORDER].reverse(),
      })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByRole('button', { name: 'Reorder' })
      await user.click(screen.getByRole('button', { name: 'Reorder' }))
      await user.click(screen.getByRole('button', { name: 'Reset order' }))

      expect(useTodayCardOrderStore.getState().order).toEqual(
        DEFAULT_TODAY_CARD_ORDER,
      )
    })

    // #359 — reported live: the button stayed enabled even when the order
    // already matched the default, so clicking it did nothing visible.
    it('disables Reset order when the order already matches the default', async () => {
      const user = userEvent.setup()
      await useDailyEntryStore.getState().saveEntry(makeEntry({ steps: 8432 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByRole('button', { name: 'Reorder' })
      await user.click(screen.getByRole('button', { name: 'Reorder' }))

      expect(screen.getByRole('button', { name: 'Reset order' })).toBeDisabled()
    })

    it('enables Reset order once the order no longer matches the default', async () => {
      const user = userEvent.setup()
      await useDailyEntryStore
        .getState()
        .saveEntry(makeEntry({ steps: 8432, sleepHours: 7.5 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })
      useTodayCardOrderStore.setState({
        order: [...DEFAULT_TODAY_CARD_ORDER].reverse(),
      })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByRole('button', { name: 'Reorder' })
      await user.click(screen.getByRole('button', { name: 'Reorder' }))

      expect(
        screen.getByRole('button', { name: 'Reset order' }),
      ).not.toBeDisabled()
    })
  })

  describe('custom metric log section (#362)', () => {
    it('does not render the section when no custom metrics are defined', async () => {
      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByLabelText('Date')
      expect(screen.queryByText('Custom metrics')).not.toBeInTheDocument()
    })

    it('logs a value for the viewed date via the bottom-of-page section', async () => {
      await db.customMetrics.put({
        id: 'metric-1',
        name: 'Push-ups',
        inputKind: 'number',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      const numberInput = await screen.findByLabelText('Push-ups')
      await user.type(numberInput, '20')
      await user.tab()

      await waitFor(async () => {
        const entries = await db.customMetricEntries.toArray()
        expect(entries[0]).toMatchObject({
          date: format(new Date(), 'yyyy-MM-dd'),
          value: 20,
        })
      })
    })
  })
})
