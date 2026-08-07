import { format, parseISO, subDays } from 'date-fns'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { recentAverageWindowRange } from '@/domain/stats'
import { useDashboardChartVisibilityStore } from '@/stores'
import { RecentAveragesCards } from './RecentAveragesCards'

function calories(
  amountKcal: number,
  macros: Partial<CalorieItem> = {},
): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal, ...macros }],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

let idCounter = 0
function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function daysAgo(n: number): string {
  return format(subDays(new Date(), n), 'yyyy-MM-dd')
}

function expectedRangeLabel(windowDays: number, today?: Date): string {
  const { startDate, endDate } = recentAverageWindowRange(windowDays, today)
  return `${format(parseISO(startDate), 'PP')} – ${format(parseISO(endDate), 'PP')}`
}

describe('RecentAveragesCards', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<RecentAveragesCards entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when nothing was logged within either window', () => {
    const entries = [entry(daysAgo(60), { calorieEntries: calories(2000) })]
    const { container } = render(<RecentAveragesCards entries={entries} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows separate 7-day and 30-day average calorie cards', () => {
    const entries = [
      entry(daysAgo(1), { calorieEntries: calories(2000) }),
      entry(daysAgo(20), { calorieEntries: calories(1000) }),
    ]
    render(<RecentAveragesCards entries={entries} />)

    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('2,000')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('shows the inclusive from→to calendar range on each card (#506)', () => {
    const entries = [
      entry(daysAgo(1), { calorieEntries: calories(2000) }),
      entry(daysAgo(20), { calorieEntries: calories(1000) }),
    ]
    render(<RecentAveragesCards entries={entries} />)

    expect(screen.getByText(expectedRangeLabel(7))).toBeInTheDocument()
    expect(screen.getByText(expectedRangeLabel(30))).toBeInTheDocument()
  })

  // #625 — "today" for this rolling window now respects day-start, same as
  // the Day screen's own "today" already does.
  it('keeps "today" pinned to the prior day past midnight but before day-start (#625)', async () => {
    const { useDayStartStore } = await import('@/stores')
    useDayStartStore.setState({ dayStartTime: '04:00' })
    vi.useFakeTimers()
    // Monday 2026-08-03, 01:00 — real calendar Monday, but still "Sunday
    // night" per a 04:00 day-start.
    vi.setSystemTime(new Date('2026-08-03T01:00:00'))
    const entries = [entry('2026-08-02', { calorieEntries: calories(2000) })]
    render(<RecentAveragesCards entries={entries} />)

    const dayStartToday = new Date('2026-08-02T01:00:00')
    // Without the day-start adjustment, the window would already end on
    // 2026-08-03 once the real clock ticks past midnight.
    expect(
      screen.getByText(expectedRangeLabel(7, dayStartToday)),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Aug 3, 2026/)).not.toBeInTheDocument()

    vi.useRealTimers()
    useDayStartStore.setState({ dayStartTime: '00:00' })
  })

  it('shows the average protein alongside average calories', () => {
    const entries = [
      entry(daysAgo(1), {
        calorieEntries: calories(2000, { proteinG: 100 }),
      }),
    ]
    render(<RecentAveragesCards entries={entries} />)

    // Range + protein share the description line; a day 1 day back falls
    // within both windows, so the protein fragment appears twice.
    expect(screen.getAllByText(/Protein: 100g/)).toHaveLength(2)
  })

  it('only shows the 30-day card when the 7-day window has no data', () => {
    const entries = [entry(daysAgo(20), { calorieEntries: calories(1500) })]
    render(<RecentAveragesCards entries={entries} />)

    expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.queryByText(expectedRangeLabel(7))).not.toBeInTheDocument()
    expect(screen.getByText(expectedRangeLabel(30))).toBeInTheDocument()
  })

  describe('whole-card show/hide toggle (#232)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, recentAverages: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      const entries = [entry(daysAgo(1), { calorieEntries: calories(2000) })]
      render(<RecentAveragesCards entries={entries} />)

      const title = 'Recent averages'
      expect(screen.getByText(title)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: `Hide ${title}` }))

      expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
      const showButton = screen.getByRole('button', { name: `Show ${title}` })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    })
  })
})
