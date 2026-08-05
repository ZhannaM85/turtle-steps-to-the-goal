import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  useCycleTrackingStore,
  useDashboardChartVisibilityStore,
  useOutlierExclusionStore,
  useTrendChartSeriesStore,
} from '@/stores'
import { WeightTrendChart } from './WeightTrendChart'

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

function threeWeightEntries(): DailyEntry[] {
  return [
    entry('2026-03-01', { weightKg: 82 }),
    entry('2026-03-02', { weightKg: 81.5 }),
    entry('2026-03-03', { weightKg: 81 }),
  ]
}

describe('WeightTrendChart', () => {
  it('renders nothing when there are no weight entries', () => {
    const { container } = render(<WeightTrendChart entries={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the weight legend when there is enough weight data', () => {
    render(<WeightTrendChart entries={threeWeightEntries()} />, {
      wrapper: MemoryRouter,
    })

    expect(screen.getByText('weight')).toBeInTheDocument()
  })

  it('does not show a projection legend (#46: prognosis line removed)', () => {
    render(<WeightTrendChart entries={threeWeightEntries()} />, {
      wrapper: MemoryRouter,
    })

    expect(screen.queryByText('projected')).not.toBeInTheDocument()
  })

  describe('cycle period weight note (#615)', () => {
    afterEach(() => {
      useCycleTrackingStore.setState({ enabled: false })
    })

    it('shows the note once cycle tracking is on', () => {
      useCycleTrackingStore.setState({ enabled: true })
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.getByText(/Weight often fluctuates around your period/),
      ).toBeInTheDocument()
    })

    it('shows no note when cycle tracking is off', () => {
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.queryByText(/Weight often fluctuates around your period/),
      ).not.toBeInTheDocument()
    })
  })

  describe('7-day rolling average overlay (#214)', () => {
    it('shows the rolling-average legend alongside the weight one', () => {
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(screen.getByText('weight')).toBeInTheDocument()
      expect(screen.getByText('7-day average')).toBeInTheDocument()
    })
  })

  describe('not-enough-data gate (#217)', () => {
    it('shows a message instead of the chart with only 1-2 weight entries', () => {
      const entries = [
        entry('2026-03-01', { weightKg: 82 }),
        entry('2026-03-20', { weightKg: 79 }),
      ]
      render(<WeightTrendChart entries={entries} />, { wrapper: MemoryRouter })

      expect(
        screen.getByText(
          'Not enough data yet to show a trend — log a few more days and check back.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('weight')).not.toBeInTheDocument()
    })

    it('renders the full chart once there are at least 3 weight entries', () => {
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.queryByText(
          'Not enough data yet to show a trend — log a few more days and check back.',
        ),
      ).not.toBeInTheDocument()
    })
  })

  describe('series toggle (#238)', () => {
    afterEach(() => {
      useTrendChartSeriesStore.setState({
        visible: {
          weight: { raw: true, average: true },
          calories: { raw: true, average: true },
        },
      })
    })

    it('toggles a series off via its legend button', async () => {
      const user = userEvent.setup()
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      const weightToggle = screen.getByRole('button', { name: 'weight' })
      expect(weightToggle).toHaveAttribute('aria-pressed', 'true')

      await user.click(weightToggle)
      expect(weightToggle).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows a "pick at least one" message once both series are turned off', async () => {
      const user = userEvent.setup()
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: 'weight' }))
      await user.click(screen.getByRole('button', { name: '7-day average' }))

      expect(
        screen.getByText('Pick at least one series to show.'),
      ).toBeInTheDocument()
    })

    it('keeps both legend toggle buttons visible and clickable once both series are off, so they can be recovered (regression)', async () => {
      const user = userEvent.setup()
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: 'weight' }))
      await user.click(screen.getByRole('button', { name: '7-day average' }))

      const weightToggle = screen.getByRole('button', { name: 'weight' })
      expect(weightToggle).toBeInTheDocument()
      expect(weightToggle).toHaveAttribute('aria-pressed', 'false')

      await user.click(weightToggle)
      expect(weightToggle).toHaveAttribute('aria-pressed', 'true')
      expect(
        screen.queryByText('Pick at least one series to show.'),
      ).not.toBeInTheDocument()
    })
  })

  describe('whole-chart show/hide toggle (#245)', () => {
    afterEach(() => {
      // Merges onto whatever keys exist rather than a full literal
      // (#232) — see CalorieTrendChart.test.tsx's identical comment.
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, weight: true },
      }))
    })

    it('hides the chart body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(screen.getByText('Weight trend')).toBeInTheDocument()
      const hideButton = screen.getByRole('button', {
        name: 'Hide Weight trend',
      })

      await user.click(hideButton)

      // The chart itself is gone, but the title and its own toggle stay —
      // same "the control can't disappear along with what it controls"
      // lesson as #238's own regression above.
      expect(screen.queryByText('weight')).not.toBeInTheDocument()
      expect(screen.getByText('Weight trend')).toBeInTheDocument()
      const showButton = screen.getByRole('button', {
        name: 'Show Weight trend',
      })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByText('weight')).toBeInTheDocument()
    })
  })

  describe('prev/next period paging (#443)', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows no paging arrows when no period is passed (pre-#443 behavior)', () => {
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.queryByRole('button', { name: 'Previous period' }),
      ).not.toBeInTheDocument()
    })

    it("shows arrows and the current week's range once period='week' is passed", () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'))
      const entries = [
        entry('2026-07-15', { weightKg: 80 }),
        entry('2026-07-16', { weightKg: 80.2 }),
        entry('2026-07-17', { weightKg: 80.1 }),
        entry('2026-07-25', { weightKg: 79 }),
        entry('2026-07-26', { weightKg: 78.8 }),
        entry('2026-07-27', { weightKg: 78.9 }),
      ]

      render(<WeightTrendChart entries={entries} period="week" />, {
        wrapper: MemoryRouter,
      })

      expect(screen.getByText('22.07.26 – 28.07.26')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Next period' }),
      ).toBeDisabled()
    })

    it('goes to the previous week when the Previous period arrow is clicked', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'))
      const user = userEvent.setup({ delay: null })
      const entries = [
        entry('2026-07-15', { weightKg: 80 }),
        entry('2026-07-16', { weightKg: 80.2 }),
        entry('2026-07-17', { weightKg: 80.1 }),
        entry('2026-07-25', { weightKg: 79 }),
        entry('2026-07-26', { weightKg: 78.8 }),
        entry('2026-07-27', { weightKg: 78.9 }),
      ]

      render(<WeightTrendChart entries={entries} period="week" />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: 'Previous period' }))

      expect(screen.getByText('15.07.26 – 21.07.26')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Next period' }),
      ).not.toBeDisabled()
    })
  })

  describe('exclude abnormal weight points (#455)', () => {
    afterEach(() => {
      useOutlierExclusionStore.setState({ excluded: {} })
    })

    // #448's own day-over-day rule: 2026-03-02 is a 3kg jump from the
    // previous calendar day (over the 2kg threshold) — 2026-03-03's own
    // 0.2kg delta from *that* stays unflagged.
    function entriesWithOneOutlier(): DailyEntry[] {
      return [
        entry('2026-03-01', { weightKg: 80 }),
        entry('2026-03-02', { weightKg: 83 }),
        entry('2026-03-03', { weightKg: 83.2 }),
      ]
    }

    it('offers an Exclude chip for a flagged point', () => {
      render(<WeightTrendChart entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.getByRole('button', {
          name: 'Exclude 2 Mar 2026 from this pattern',
        }),
      ).toBeInTheDocument()
    })

    it('shows no chip list when nothing is flagged', () => {
      render(<WeightTrendChart entries={threeWeightEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(screen.queryByText('Unusual data points')).not.toBeInTheDocument()
    })

    it('toggles a flagged point to Restore once excluded, and back again', async () => {
      const user = userEvent.setup()
      render(<WeightTrendChart entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', {
          name: 'Exclude 2 Mar 2026 from this pattern',
        }),
      )
      expect(
        screen.getByRole('button', {
          name: 'Restore 2 Mar 2026 to this pattern',
        }),
      ).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', {
          name: 'Restore 2 Mar 2026 to this pattern',
        }),
      )
      expect(
        screen.getByRole('button', {
          name: 'Exclude 2 Mar 2026 from this pattern',
        }),
      ).toBeInTheDocument()
    })
  })
})
