import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore, useTrendChartSeriesStore } from '@/stores'
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
})
