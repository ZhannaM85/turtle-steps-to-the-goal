import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore, useTrendChartSeriesStore } from '@/stores'
import { CalorieTrendChart } from './CalorieTrendChart'

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

function calorieEntry(kcal: number) {
  return {
    id: crypto.randomUUID(),
    items: [{ id: crypto.randomUUID(), amountKcal: kcal }],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function threeCalorieEntries(): DailyEntry[] {
  return [
    entry('2026-03-01', { calorieEntries: [calorieEntry(1900)] }),
    entry('2026-03-02', { calorieEntries: [calorieEntry(2000)] }),
    entry('2026-03-03', { calorieEntries: [calorieEntry(1800)] }),
  ]
}

describe('CalorieTrendChart', () => {
  it('renders nothing when there are no calorie entries', () => {
    const { container } = render(<CalorieTrendChart entries={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the calorie and rolling-average legends when there is enough data', () => {
    render(<CalorieTrendChart entries={threeCalorieEntries()} />, {
      wrapper: MemoryRouter,
    })

    expect(screen.getByText('calories')).toBeInTheDocument()
    expect(screen.getByText('7-day average')).toBeInTheDocument()
  })

  describe('not-enough-data gate (#217)', () => {
    it('shows a message instead of the chart with only 1-2 calorie entries', () => {
      const entries = [
        entry('2026-03-01', { calorieEntries: [calorieEntry(1900)] }),
      ]
      render(<CalorieTrendChart entries={entries} />, { wrapper: MemoryRouter })

      expect(
        screen.getByText(
          'Not enough data yet to show a trend — log a few more days and check back.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('calories')).not.toBeInTheDocument()
    })

    it('renders the full chart once there are at least 3 calorie entries', () => {
      render(<CalorieTrendChart entries={threeCalorieEntries()} />, {
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
      render(<CalorieTrendChart entries={threeCalorieEntries()} />, {
        wrapper: MemoryRouter,
      })

      const caloriesToggle = screen.getByRole('button', { name: 'calories' })
      expect(caloriesToggle).toHaveAttribute('aria-pressed', 'true')

      await user.click(caloriesToggle)
      expect(caloriesToggle).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows a "pick at least one" message once both series are turned off', async () => {
      const user = userEvent.setup()
      render(<CalorieTrendChart entries={threeCalorieEntries()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: 'calories' }))
      await user.click(screen.getByRole('button', { name: '7-day average' }))

      expect(
        screen.getByText('Pick at least one series to show.'),
      ).toBeInTheDocument()
    })

    it('keeps both legend toggle buttons visible and clickable once both series are off, so they can be recovered (regression)', async () => {
      const user = userEvent.setup()
      render(<CalorieTrendChart entries={threeCalorieEntries()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(screen.getByRole('button', { name: 'calories' }))
      await user.click(screen.getByRole('button', { name: '7-day average' }))

      const caloriesToggle = screen.getByRole('button', { name: 'calories' })
      expect(caloriesToggle).toBeInTheDocument()
      expect(caloriesToggle).toHaveAttribute('aria-pressed', 'false')

      await user.click(caloriesToggle)
      expect(caloriesToggle).toHaveAttribute('aria-pressed', 'true')
      expect(
        screen.queryByText('Pick at least one series to show.'),
      ).not.toBeInTheDocument()
    })
  })

  describe('whole-chart show/hide toggle (#245)', () => {
    afterEach(() => {
      // Merges onto whatever keys exist rather than a full literal
      // (#232) — a full replacement breaks every time a new Dashboard
      // section's key gets added to DashboardChartKey, even though this
      // describe block only ever touches `calories`.
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, calories: true },
      }))
    })

    it('hides the chart body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      render(<CalorieTrendChart entries={threeCalorieEntries()} />, {
        wrapper: MemoryRouter,
      })

      expect(screen.getByText('Calorie trend')).toBeInTheDocument()
      const hideButton = screen.getByRole('button', {
        name: 'Hide Calorie trend',
      })

      await user.click(hideButton)

      expect(screen.queryByText('calories')).not.toBeInTheDocument()
      expect(screen.getByText('Calorie trend')).toBeInTheDocument()
      const showButton = screen.getByRole('button', {
        name: 'Show Calorie trend',
      })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByText('calories')).toBeInTheDocument()
    })
  })
})
