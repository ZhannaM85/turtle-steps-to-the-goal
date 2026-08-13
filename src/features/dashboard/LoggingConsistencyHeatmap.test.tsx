import { format } from 'date-fns'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore } from '@/stores'
import { LoggingConsistencyHeatmap } from './LoggingConsistencyHeatmap'

function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
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

describe('LoggingConsistencyHeatmap', () => {
  it('shows empty state when there are no entries', () => {
    render(<LoggingConsistencyHeatmap entries={[]} />)
    expect(screen.getByText('Logging consistency')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Nothing to show here yet — keep logging, or widen the date range if you filtered it.',
      ),
    ).toBeInTheDocument()
  })

  it('renders the title and a legend once there is at least one entry', () => {
    const entries = [entry(today(), { weightKg: 80 })]
    render(<LoggingConsistencyHeatmap entries={entries} />)

    expect(screen.getByText('Logging consistency')).toBeInTheDocument()
    expect(screen.getByText('Less')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  // #268 — plain totals next to the heatmap, no more counting colored
  // boxes by eye to find out how many days were actually logged.
  it('shows days-logged and total-calories counts next to the heatmap', () => {
    const entries = [
      entry(today(), {
        weightKg: 80,
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: 500 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ]
    render(<LoggingConsistencyHeatmap entries={entries} />)

    // #272 — one stat per row, not one joined sentence (which wrapped
    // awkwardly on a real phone).
    expect(screen.getByText('1 days logged')).toBeInTheDocument()
    expect(
      screen.getByText('500 kcal over the logged days'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('500 kcal in the last 7 days'),
    ).toBeInTheDocument()
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
    const entries = [entry('2026-07-27', { weightKg: 80 })] // a Monday

    render(<LoggingConsistencyHeatmap entries={entries} />)

    // Without the day-start adjustment, a new week row (Aug 3-9) would
    // already start rendering once the real clock ticks past midnight.
    expect(screen.getByText('Jul 27')).toBeInTheDocument()
    expect(screen.queryByText('Aug 3')).not.toBeInTheDocument()

    vi.useRealTimers()
    useDayStartStore.setState({ dayStartTime: '00:00' })
  })

  it('gives a fully-logged day a title reflecting its full score', () => {
    const entries = [
      entry(today(), {
        weightKg: 80,
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: 500 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        sleepHours: 7,
        steps: 5000,
      }),
    ]
    render(<LoggingConsistencyHeatmap entries={entries} />)

    expect(screen.getByTitle(/: 4\/4$/)).toBeInTheDocument()
  })

  describe('whole-card show/hide toggle (#232)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, loggingConsistency: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      const entries = [entry(today(), { weightKg: 80 })]
      render(<LoggingConsistencyHeatmap entries={entries} />)

      const title = 'Logging consistency'
      expect(screen.getByText(title)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: `Hide ${title}` }))

      expect(screen.queryByText('Less')).not.toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
      const showButton = screen.getByRole('button', { name: `Show ${title}` })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByText('Less')).toBeInTheDocument()
    })
  })
})
