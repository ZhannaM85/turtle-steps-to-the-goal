import 'fake-indexeddb/auto'
import type { ReactNode } from 'react'
import { format, startOfISOWeek, subDays, subWeeks } from 'date-fns'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  DASHBOARD_PERIOD_CHART_KEYS,
  useDashboardPeriodStore,
  useDashboardSectionOrderStore,
  useGoalStore,
} from '@/stores'
import { DashboardScreen } from './DashboardScreen'

// #297 — same reasoning DailyEntryForm.test.tsx's own meal-reorder tests
// already documented: jsdom has no layout engine, so a real pointer/
// keyboard drag can't produce meaningful rects for dnd-kit's collision
// detection. Trust dnd-kit itself (independently tested) to turn real
// gestures into DragEndEvents, and only test this screen's own onDragEnd
// wiring by capturing and invoking it directly with a synthetic event.
let capturedOnDragEnd:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void)
  | undefined

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: {
      onDragEnd: typeof capturedOnDragEnd
      children: ReactNode
    }) => {
      capturedOnDragEnd = props.onDragEnd
      return props.children
    },
  }
})

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-03-01',
    weightKg: 80,
    calorieEntries: [
      {
        id: crypto.randomUUID(),
        items: [{ id: crypto.randomUUID(), amountKcal: 2000 }],
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  useGoalStore.setState({ goal: null, status: 'idle', error: null })
  useDashboardSectionOrderStore.persist.clearStorage()
  useDashboardSectionOrderStore.setState({
    order: DEFAULT_DASHBOARD_SECTION_ORDER,
  })
  useDashboardPeriodStore.setState({
    byChart: Object.fromEntries(
      DASHBOARD_PERIOD_CHART_KEYS.map((key) => [
        key,
        { period: 'all', customStart: '', customEnd: '' },
      ]),
    ) as ReturnType<typeof useDashboardPeriodStore.getState>['byChart'],
  })
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
})

describe('DashboardScreen', () => {
  it('shows an empty state when there are no entries yet', async () => {
    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('No entries yet')).toBeInTheDocument()
  })

  it('renders the charts and weekly summary once enough entries exist', async () => {
    // #217: charts need >= 3 logged days before they draw a trend line
    // rather than showing a "not enough data" message.
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-03' }))

    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('Weekly summary')).toBeInTheDocument()
    expect(screen.getByText('weight')).toBeInTheDocument()
    expect(screen.getByText('calories')).toBeInTheDocument()
  })

  describe('drag-and-drop section reordering (#297)', () => {
    it('persists a new order and re-renders sections in that order', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-03' }))

      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      const titlesBefore = screen
        .getAllByRole('heading', { level: 2 })
        .map((el) => el.textContent)
      expect(titlesBefore.indexOf('Weight trend')).toBeLessThan(
        titlesBefore.indexOf('Calorie trend'),
      )

      // Drags "weight" to where "calories" was.
      act(() => {
        capturedOnDragEnd?.({ active: { id: 'weight' }, over: { id: 'calories' } })
      })

      expect(useDashboardSectionOrderStore.getState().order.slice(0, 2)).toEqual([
        'calories',
        'weight',
      ])
      const titlesAfter = screen
        .getAllByRole('heading', { level: 2 })
        .map((el) => el.textContent)
      expect(titlesAfter.indexOf('Calorie trend')).toBeLessThan(
        titlesAfter.indexOf('Weight trend'),
      )
    })

    it('does not reorder when a drag ends over itself or nothing', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-03' }))

      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      act(() => {
        capturedOnDragEnd?.({ active: { id: 'weight' }, over: { id: 'weight' } })
        capturedOnDragEnd?.({ active: { id: 'weight' }, over: null })
      })

      expect(useDashboardSectionOrderStore.getState().order).toEqual(
        DEFAULT_DASHBOARD_SECTION_ORDER,
      )
    })
  })

  describe('on-demand reorder mode (#319)', () => {
    it('hides drag handles until the Reorder button is clicked, then hides them again on Save', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-03' }))

      const user = userEvent.setup()
      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      expect(screen.queryByLabelText('Reorder section 1')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Reorder' }))

      expect(screen.getByLabelText('Reorder section 1')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(screen.queryByLabelText('Reorder section 1')).not.toBeInTheDocument()
    })

    // #355 — reported live: the handle rendered on its own line above the
    // whole section (title included) instead of beside just the title.
    it('renders the drag handle beside its section title, not stacked above it', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
      await db.dailyEntries.put(makeEntry({ date: '2026-03-03' }))

      const user = userEvent.setup()
      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      await user.click(screen.getByRole('button', { name: 'Reorder' }))

      const handle = screen.getByLabelText('Reorder section 1')
      const title = screen.getByText('Weight trend')
      // The handle and the title are siblings under the same title row —
      // the same parent element contains both, rather than the handle
      // living in a separate wrapper above the whole section.
      expect(handle.parentElement).toContainElement(title)
    })
  })

  describe('reset to default order (#356)', () => {
    it('only shows the Reset order button while reordering', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      const user = userEvent.setup()
      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      expect(
        screen.queryByRole('button', { name: 'Reset order' }),
      ).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Reorder' }))

      expect(
        screen.getByRole('button', { name: 'Reset order' }),
      ).toBeInTheDocument()
    })

    it('restores the default section order', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      useDashboardSectionOrderStore.setState({
        order: [...DEFAULT_DASHBOARD_SECTION_ORDER].reverse(),
      })
      const user = userEvent.setup()
      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      await user.click(screen.getByRole('button', { name: 'Reorder' }))
      await user.click(screen.getByRole('button', { name: 'Reset order' }))

      expect(useDashboardSectionOrderStore.getState().order).toEqual(
        DEFAULT_DASHBOARD_SECTION_ORDER,
      )
    })

    // #359 — reported live: the button stayed enabled even when the order
    // already matched the default, so clicking it did nothing visible.
    it('disables Reset order when the order already matches the default', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      const user = userEvent.setup()
      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      await user.click(screen.getByRole('button', { name: 'Reorder' }))

      expect(screen.getByRole('button', { name: 'Reset order' })).toBeDisabled()
    })

    it('enables Reset order once the order no longer matches the default', async () => {
      await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
      useDashboardSectionOrderStore.setState({
        order: [...DEFAULT_DASHBOARD_SECTION_ORDER].reverse(),
      })
      const user = userEvent.setup()
      render(<DashboardScreen />, { wrapper: MemoryRouter })
      await screen.findByText('Weight trend')

      await user.click(screen.getByRole('button', { name: 'Reorder' }))

      expect(
        screen.getByRole('button', { name: 'Reset order' }),
      ).not.toBeDisabled()
    })
  })

  it('renders the monthly summary once entries exist (#226)', async () => {
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))

    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('Monthly summary')).toBeInTheDocument()
    expect(screen.getByText('March 2026')).toBeInTheDocument()
  })

  describe('per-chart period picker (#536)', () => {
    it("scopes the Weight trend chart to its own period, without affecting Weekly summary", async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      // 3 old entries (>1 year back) give 'all' enough points for a trend
      // line and their own week a Weekly summary entry; 1 more entry today
      // means only 1 point falls inside a 'week' window once selected.
      await db.dailyEntries.put(
        makeEntry({ date: format(subDays(new Date(), 400), 'yyyy-MM-dd') }),
      )
      await db.dailyEntries.put(
        makeEntry({ date: format(subDays(new Date(), 399), 'yyyy-MM-dd') }),
      )
      await db.dailyEntries.put(
        makeEntry({ date: format(subDays(new Date(), 398), 'yyyy-MM-dd') }),
      )
      await db.dailyEntries.put(makeEntry({ date: today }))

      const user = userEvent.setup()
      render(<DashboardScreen />, { wrapper: MemoryRouter })
      const weightHeading = await screen.findByText('Weight trend')
      const weightSection = weightHeading.closest(
        '.rounded-lg.border.border-border.p-3',
      ) as HTMLElement

      // 'all' (the default): 4 points is enough for a trend line.
      expect(weightSection).not.toHaveTextContent('Not enough data yet')
      // Weekly summary reflects the full history regardless of the
      // picker — the 400-days-ago week's own range label should show.
      const oldWeekLabel = format(subDays(new Date(), 400), 'yyyy')
      expect(screen.getByText('Weekly summary')).toBeInTheDocument()
      expect(screen.getAllByText(new RegExp(oldWeekLabel)).length).toBeGreaterThan(0)

      await user.click(
        within(weightSection).getByRole('radio', { name: 'Week' }),
      )

      // Now only "today"'s single point falls inside the window — below
      // MIN_TREND_DATA_POINTS, so the trend chart falls back to the
      // not-enough-data message instead of drawing a misleading line.
      expect(weightSection).toHaveTextContent('Not enough data yet')
      // Weekly summary is untouched by the picker (deliberately not part of
      // period-scoped charts) — the old week's card still shows.
      expect(screen.getAllByText(new RegExp(oldWeekLabel)).length).toBeGreaterThan(0)
    })

    it('scopes correlation views to their own period (#396/#536)', async () => {
      // #585 — after #522, correlation points need finished weeks with a
      // prior-week weight delta. Three consecutive days ~400d ago only make
      // one week (no prior → no delta) + incomplete "today" week → rawPoints
      // empty → CorrelationView returns null. Seed several completed weeks
      // ending before this week (same idea as CorrelationView.test.tsx),
      // then one entry today so the Week period has nothing comparable.
      const today = new Date()
      const thisMonday = startOfISOWeek(today)
      for (let i = 0; i < 6; i++) {
        await db.dailyEntries.put(
          makeEntry({
            date: format(subWeeks(thisMonday, 8 - i), 'yyyy-MM-dd'),
            weightKg: 85 - i * 0.3,
            calorieEntries: [
              {
                id: crypto.randomUUID(),
                items: [
                  {
                    id: crypto.randomUUID(),
                    amountKcal: 1600 + i * 80,
                  },
                ],
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        )
      }
      // Trailing weight in the week after the last comparable one so #522
      // keeps those weeks finished relative to max entry date / today.
      await db.dailyEntries.put(
        makeEntry({
          date: format(subWeeks(thisMonday, 1), 'yyyy-MM-dd'),
          weightKg: 83,
          calorieEntries: undefined,
        }),
      )
      await db.dailyEntries.put(
        makeEntry({ date: format(today, 'yyyy-MM-dd') }),
      )

      const user = userEvent.setup()
      render(<DashboardScreen />, { wrapper: MemoryRouter })
      const correlationHeading = await screen.findByText(
        'Calories vs. weight change',
      )
      const correlationSection = correlationHeading.closest(
        '.rounded-lg.border.border-border.p-3',
      ) as HTMLElement

      expect(correlationSection).toBeInTheDocument()

      await user.click(
        within(correlationSection).getByRole('radio', { name: 'Week' }),
      )

      // #708 — empty period keeps the card mounted (title + empty copy)
      // instead of returning null; scoping still drops the plot/insight.
      expect(
        screen.getByText('Calories vs. weight change'),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Not enough data yet to see a pattern — keep logging and check back in a few weeks.',
        ),
      ).toBeInTheDocument()
      // Weight chart still has its own period (All) and enough points.
      expect(screen.getByText('Weight trend')).toBeInTheDocument()
    })
  })

  it('renders the recent-averages cards once entries exist (#215)', async () => {
    // Recent-averages is anchored to the real current date, unlike the
    // other tests here which use fixed 2026-03 dates that fall well
    // outside any real "last 30 days" window.
    await db.dailyEntries.put(makeEntry({ date: format(new Date(), 'yyyy-MM-dd') }))

    render(<DashboardScreen />, { wrapper: MemoryRouter })

    expect(await screen.findByText('Recent averages')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
  })
})
