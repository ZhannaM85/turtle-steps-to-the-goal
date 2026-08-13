import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import {
  useDashboardChartVisibilityStore,
  useOutlierExclusionStore,
} from '@/stores'
import { CorrelationView } from './CorrelationView'
import { MemoryRouter } from 'react-router-dom'

function calories(amountKcal: number): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal }],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
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

const TITLE = 'Calories vs. next-day weight'
const EMPTY =
  'Not enough data yet to see a pattern — log calories and keep tracking weight, then check back in a few weeks.'

describe('CorrelationView', () => {
  it('shows the empty-state card when there are no comparable day-pairs', () => {
    render(<CorrelationView entries={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(screen.getByText(TITLE)).toBeInTheDocument()
    expect(screen.getByText(EMPTY)).toBeInTheDocument()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: calories(1800) }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

    expect(screen.getByText(/Not enough data yet to see a pattern/)).toBeInTheDocument()
  })

  it('collapses the near-empty plot by default with fewer than 8 pairs (#89)', async () => {
    const user = userEvent.setup()
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: calories(1800) }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    const { container } = render(<CorrelationView entries={entries} />, {
      wrapper: MemoryRouter,
    })

    expect(container.querySelector('.recharts-wrapper')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show chart' }))

    expect(
      screen.getByRole('button', { name: 'Hide chart' }),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: calories(1400) }),
      entry(day(1), { weightKg: 80.8, calorieEntries: calories(1500) }),
      entry(day(2), { weightKg: 81.7, calorieEntries: calories(1600) }),
      entry(day(3), { weightKg: 82.5, calorieEntries: calories(1700) }),
      entry(day(4), { weightKg: 82.6, calorieEntries: calories(2400) }),
      entry(day(5), { weightKg: 82.65, calorieEntries: calories(2500) }),
      entry(day(6), { weightKg: 82.75, calorieEntries: calories(2600) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: calories(2700) }),
      entry(day(8), { weightKg: 82.85 }),
    ]
    render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

    expect(
      screen.getByText(/averaged more weight gain the next morning/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
  })

  describe('outlier detection and exclusion (#224)', () => {
    afterEach(() => {
      localStorage.clear()
      useOutlierExclusionStore.setState({ excluded: {} })
    })

    function entriesWithOneOutlier(): DailyEntry[] {
      return [
        entry(day(0), { weightKg: 80.0, calorieEntries: calories(1400) }),
        entry(day(1), { weightKg: 80.8, calorieEntries: calories(1500) }),
        entry(day(2), { weightKg: 81.7, calorieEntries: calories(1600) }),
        entry(day(3), { weightKg: 82.5, calorieEntries: calories(1700) }),
        entry(day(4), { weightKg: 82.6, calorieEntries: calories(2400) }),
        entry(day(5), { weightKg: 82.65, calorieEntries: calories(2500) }),
        entry(day(6), { weightKg: 82.75, calorieEntries: calories(2600) }),
        entry(day(7), { weightKg: 82.8, calorieEntries: calories(2700) }),
        entry(day(8), { weightKg: 82.85, calorieEntries: calories(2700) }),
        entry(day(9), { weightKg: 70.0 }),
      ]
    }

    it('lists the flagged outlier day as an excludable button', () => {
      render(<CorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.getByRole('button', { name: /Exclude 9 Mar 2026/ }),
      ).toBeInTheDocument()
    })

    it('links the flagged outlier day to that day on Today (#372, #389)', () => {
      render(<CorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      const link = screen.getByRole('link', {
        name: 'Edit 9 Mar 2026',
      })
      expect(link).toHaveAttribute('href', '/?date=2026-03-09')
    })

    it('excludes the flagged day from the summary once tapped', async () => {
      const user = userEvent.setup()
      render(<CorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      expect(screen.getByText(/Based on 9 days of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: /Exclude 9 Mar 2026/ }),
      )

      expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
    })

    it('restores an excluded day when tapped again', async () => {
      const user = userEvent.setup()
      render(<CorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', { name: /Exclude 9 Mar 2026/ }),
      )
      expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: /Restore 9 Mar 2026/ }),
      )

      expect(screen.getByText(/Based on 9 days of data\./)).toBeInTheDocument()
    })
  })

  describe('whole-card show/hide toggle (#247)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, calorieWeightCorrelation: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      const entries = [
        entry(day(0), { weightKg: 80.0, calorieEntries: calories(1400) }),
        entry(day(1), { weightKg: 80.8, calorieEntries: calories(1500) }),
        entry(day(2), { weightKg: 81.7, calorieEntries: calories(1600) }),
        entry(day(3), { weightKg: 82.5, calorieEntries: calories(1700) }),
        entry(day(4), { weightKg: 82.6, calorieEntries: calories(2400) }),
        entry(day(5), { weightKg: 82.65, calorieEntries: calories(2500) }),
        entry(day(6), { weightKg: 82.75, calorieEntries: calories(2600) }),
        entry(day(7), { weightKg: 82.8, calorieEntries: calories(2700) }),
        entry(day(8), { weightKg: 82.85 }),
      ]
      render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

      expect(screen.getByText(TITLE)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: `Hide ${TITLE}` }))

      expect(
        screen.queryByText(/averaged more weight gain the next morning/),
      ).not.toBeInTheDocument()
      expect(screen.getByText(TITLE)).toBeInTheDocument()
      const showButton = screen.getByRole('button', { name: `Show ${TITLE}` })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(
        screen.getByText(/averaged more weight gain the next morning/),
      ).toBeInTheDocument()
    })
  })
})
