import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format, subDays } from 'date-fns'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/domain/goal'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  useDailyEntryStore,
  useDailyReminderStore,
  useDayStartStore,
  useGoalStore,
  useProfileStore,
  useSectionVisibilityStore,
} from '@/stores'
import { TodayScreen } from './TodayScreen'

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
  localStorage.clear()
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
  useDailyEntryStore.setState({
    date: null,
    entry: null,
    status: 'idle',
    error: null,
  })
  useDailyReminderStore.setState({ enabled: false })
  useProfileStore.setState({ heightCm: undefined, age: undefined, sex: undefined })
  useDayStartStore.setState({ dayStartTime: '00:00' })
  resetSectionVisibility()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  localStorage.clear()
  useDailyReminderStore.setState({ enabled: false })
  useProfileStore.setState({ heightCm: undefined, age: undefined, sex: undefined })
  useDayStartStore.setState({ dayStartTime: '00:00' })
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
// (which is what navigate(-1) from MealEditScreen does), not a re-render
// of one already-mounted instance.
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
    expect(screen.getByText('-1.0')).toBeInTheDocument()
    expect(screen.getByText('kg to lose')).toBeInTheDocument()
  })

  it("shows the goal's own anchored 7-day window, not a calendar week (#135)", async () => {
    await useGoalStore
      .getState()
      .saveGoal(makeGoal({ targetWeeklyLossKg: 1, weekStart: '2026-03-09' }))

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Mar 9 – Mar 15')).toBeInTheDocument()
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
      screen.queryByText("You reached this week's goal!"),
    ).not.toBeInTheDocument()

    await user.type(await screen.findByLabelText('Weight (kg)'), '59.8')
    await user.click(screen.getByRole('button', { name: 'Save weight' }))

    expect(
      await screen.findByText("You reached this week's goal!"),
    ).toBeInTheDocument()

    // #235's own persistent complement to the modal above — stays visible
    // even after the modal is dismissed, unlike the one-time dialog.
    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(
      await screen.findByText("You reached this week's target!"),
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

  it('disables the next-day arrow once already on today', async () => {
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Date')).toHaveValue(
      format(new Date(), 'yyyy-MM-dd'),
    )
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
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

    expect(await screen.findByText('79.5 kg')).toBeInTheDocument()
    expect(screen.getByText('1,900')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit weight' }),
    ).toBeInTheDocument()
  })

  describe('goal renewal reminder (#135: anchored to goal.weekStart, not a calendar week)', () => {
    it("shows once the goal's 7-day window has run its course", async () => {
      const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd') // weekEnd == today
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

      await screen.findByText('80 kg')
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

  describe('BMI/BMR (#233)', () => {
    it('shows neither card with no profile data logged', async () => {
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 80 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByLabelText('Date')
      expect(screen.queryByText('BMI')).not.toBeInTheDocument()
      expect(
        screen.queryByText('Estimated daily calories (BMR)'),
      ).not.toBeInTheDocument()
    })

    it('shows BMI once height and a logged weight exist, even without age/sex', async () => {
      useProfileStore.setState({ heightCm: 165 })
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 70 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(await screen.findByText('BMI')).toBeInTheDocument()
      expect(screen.getByText('25.7')).toBeInTheDocument()
      expect(
        screen.queryByText('Estimated daily calories (BMR)'),
      ).not.toBeInTheDocument()
    })

    it('shows BMR once height, age, and sex are all set alongside a logged weight', async () => {
      useProfileStore.setState({ heightCm: 165, age: 30, sex: 'female' })
      await useDailyEntryStore.getState().saveEntry(makeEntry({ weightKg: 70 }))
      useDailyEntryStore.setState({ entry: null, date: null, status: 'idle' })

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByText('Estimated daily calories (BMR)'),
      ).toBeInTheDocument()
      expect(screen.getByText('1,420')).toBeInTheDocument()
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

    it('shows what remains once a target is set, treating nothing logged as 0 consumed', async () => {
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ dailyCalorieTargetKcal: 2000 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByText('Remaining calories'),
      ).toBeInTheDocument()
      expect(screen.getByText('2,000')).toBeInTheDocument()
      expect(screen.getByText('kcal remaining')).toBeInTheDocument()
      expect(screen.getByText('of 2,000 kcal')).toBeInTheDocument()
    })

    it('subtracts what was actually logged today', async () => {
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
      // nothing-logged value (2,000) before re-rendering with the real
      // one. findByText (polls) instead of getByText (synchronous) waits
      // out that second render instead of racing it.
      expect(await within(card).findByText('500')).toBeInTheDocument()
      expect(within(card).getByText('kcal remaining')).toBeInTheDocument()
    })

    it('reads as "over" once logged calories exceed the target', async () => {
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
      expect(screen.getByText('of 120g')).toBeInTheDocument()
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
      expect(within(card).getByText('of 120g')).toBeInTheDocument()
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
      expect(within(card).getByText('of 100g — great job!')).toBeInTheDocument()
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
      expect(screen.getByText('of 60g')).toBeInTheDocument()
      expect(await screen.findByText('Remaining carbs')).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('of 200g')).toBeInTheDocument()
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
      // Neutral denominator, not protein's positive "great job!" framing.
      expect(within(card).getByText('of 50g')).toBeInTheDocument()
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
      expect(within(card).getByText('of 100g')).toBeInTheDocument()
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
    })

    it('subtracts what was actually logged today', async () => {
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
      // Simulates what navigate(-1) does after closing a meal edited from a
      // previous day (#200's exact repro): TodayScreen fully remounts at
      // the same URL it was left at, rather than re-rendering in place.
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      renderToday([`/?date=${yesterday}`])

      expect(await screen.findByLabelText('Date')).toHaveValue(yesterday)
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
  })
})
