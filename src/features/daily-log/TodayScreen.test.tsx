import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format, subDays } from 'date-fns'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useDailyReminderStore, useGoalStore } from '@/stores'
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
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  localStorage.clear()
  useDailyReminderStore.setState({ enabled: false })
})

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
      expect(within(card).getByText('500')).toBeInTheDocument()
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
      // the direction instead.
      expect(within(card).getByText('300')).toBeInTheDocument()
      expect(within(card).getByText('kcal over')).toBeInTheDocument()
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
      expect(within(card).getByText('30')).toBeInTheDocument()
      expect(within(card).getByText('g remaining')).toBeInTheDocument()
    })

    it('clamps at 0 once the target has been met or exceeded, rather than going negative', async () => {
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
      expect(within(card).getByText('0')).toBeInTheDocument()
      expect(within(card).getByText('g remaining')).toBeInTheDocument()
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
})
