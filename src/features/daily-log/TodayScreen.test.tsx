import 'fake-indexeddb/auto'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format, subDays } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Goal } from '@/domain/goal'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useGoalStore } from '@/stores'
import { TodayScreen } from './TodayScreen'

// The reminder condition (#38) compares useCurrentWeekInfo()'s weekEnd
// against today's real date, which is only ever true on an actual Sunday.
// Rather than faking the system clock (which testing-library's async
// findBy/waitFor utilities don't play well with), patch just the
// weekEnd field after the real hook resolves, so tests stay deterministic
// without losing the real hook's Week-N/async-loading behavior.
let weekEndOverride: string | undefined

vi.mock('@/shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/hooks')>()
  return {
    ...actual,
    useCurrentWeekInfo: (
      ...args: Parameters<typeof actual.useCurrentWeekInfo>
    ) => {
      const real = actual.useCurrentWeekInfo(...args)
      if (weekEndOverride === undefined || !real) return real
      return { ...real, weekEnd: weekEndOverride }
    },
  }
})

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
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
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
  useDailyEntryStore.setState({
    date: null,
    entry: null,
    status: 'idle',
    error: null,
  })
  weekEndOverride = undefined
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  weekEndOverride = undefined
})

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
    expect(screen.getByText('1.0')).toBeInTheDocument()
    expect(screen.getByText('kg to lose')).toBeInTheDocument()
  })

  it('shows Week 1 with no entries logged yet', async () => {
    await useGoalStore.getState().saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/^Week 1 · /)).toBeInTheDocument()
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

  it('loads an existing entry for editing when picking a date that already has one', async () => {
    await useDailyEntryStore.getState().saveEntry(
      makeEntry({
        weightKg: 79.5,
        calorieEntries: [
          {
            id: crypto.randomUUID(),
            amountKcal: 1900,
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

  describe('goal renewal reminder', () => {
    it('shows on the last day of the current week when a goal exists', async () => {
      weekEndOverride = format(new Date(), 'yyyy-MM-dd')
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      expect(
        await screen.findByText(/worth checking next week's target/),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Review goal' })).toHaveAttribute(
        'href',
        '/goal',
      )
    })

    it('does not show earlier in the week', async () => {
      weekEndOverride = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      await useGoalStore
        .getState()
        .saveGoal(makeGoal({ targetWeeklyLossKg: 1 }))

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText("This week's target")
      expect(
        screen.queryByText(/worth checking next week's target/),
      ).not.toBeInTheDocument()
    })

    it('does not show when there is no goal, even on the last day of the week', async () => {
      weekEndOverride = format(new Date(), 'yyyy-MM-dd')

      render(
        <MemoryRouter>
          <TodayScreen />
        </MemoryRouter>,
      )

      await screen.findByText('No goal set yet')
      expect(
        screen.queryByText(/worth checking next week's target/),
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

      expect(await screen.findByText('vs. yesterday')).toBeInTheDocument()
      expect(screen.getByText('-0.5')).toBeInTheDocument()
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

      const value = await screen.findByText('-0.5')
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

      await screen.findByText('80.0 kg')
      expect(screen.queryByText('vs. yesterday')).not.toBeInTheDocument()
    })
  })
})
