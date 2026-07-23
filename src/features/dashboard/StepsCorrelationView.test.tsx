import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { afterEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore, useOutlierExclusionStore } from '@/stores'
import { StepsCorrelationView } from './StepsCorrelationView'

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

describe('StepsCorrelationView', () => {
  it('renders nothing with no comparable day-pairs at all', () => {
    const { container } = render(<StepsCorrelationView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, steps: 5000 }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    render(<StepsCorrelationView entries={entries} />)

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('collapses the near-empty plot by default with fewer than 8 pairs', async () => {
    const user = userEvent.setup()
    const entries = [
      entry(day(0), { weightKg: 80, steps: 5000 }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    const { container } = render(<StepsCorrelationView entries={entries} />)

    expect(container.querySelector('.recharts-wrapper')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show chart' }))

    expect(
      screen.getByRole('button', { name: 'Hide chart' }),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, steps: 2000 }),
      entry(day(1), { weightKg: 80.8, steps: 2500 }),
      entry(day(2), { weightKg: 81.7, steps: 3000 }),
      entry(day(3), { weightKg: 82.5, steps: 3500 }),
      entry(day(4), { weightKg: 82.6, steps: 9000 }),
      entry(day(5), { weightKg: 82.65, steps: 9500 }),
      entry(day(6), { weightKg: 82.75, steps: 10000 }),
      entry(day(7), { weightKg: 82.8, steps: 10500 }),
      entry(day(8), { weightKg: 82.85 }),
    ]
    render(<StepsCorrelationView entries={entries} />)

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
        entry(day(0), { weightKg: 80.0, steps: 2000 }),
        entry(day(1), { weightKg: 80.8, steps: 2500 }),
        entry(day(2), { weightKg: 81.7, steps: 3000 }),
        entry(day(3), { weightKg: 82.5, steps: 3500 }),
        entry(day(4), { weightKg: 82.6, steps: 9000 }),
        entry(day(5), { weightKg: 82.65, steps: 9500 }),
        entry(day(6), { weightKg: 82.75, steps: 10000 }),
        entry(day(7), { weightKg: 82.8, steps: 10500 }),
        entry(day(8), { weightKg: 82.85, steps: 10500 }),
        entry(day(9), { weightKg: 70.0 }),
      ]
    }

    it('lists the flagged outlier day as an excludable button', () => {
      render(<StepsCorrelationView entries={entriesWithOneOutlier()} />)

      expect(
        screen.getByRole('button', { name: 'Exclude 10 Mar from this pattern' }),
      ).toBeInTheDocument()
    })

    it('excludes the flagged day from the summary once tapped', async () => {
      const user = userEvent.setup()
      render(<StepsCorrelationView entries={entriesWithOneOutlier()} />)

      expect(screen.getByText(/Based on 9 days of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Exclude 10 Mar from this pattern' }),
      )

      expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
    })

    it('restores an excluded day when tapped again', async () => {
      const user = userEvent.setup()
      render(<StepsCorrelationView entries={entriesWithOneOutlier()} />)

      await user.click(
        screen.getByRole('button', { name: 'Exclude 10 Mar from this pattern' }),
      )
      expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Restore 10 Mar to this pattern' }),
      )

      expect(screen.getByText(/Based on 9 days of data\./)).toBeInTheDocument()
    })
  })

  describe('whole-card show/hide toggle (#247)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, stepsCorrelation: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      const entries = [
        entry(day(0), { weightKg: 80.0, steps: 2000 }),
        entry(day(1), { weightKg: 80.8, steps: 2500 }),
        entry(day(2), { weightKg: 81.7, steps: 3000 }),
        entry(day(3), { weightKg: 82.5, steps: 3500 }),
        entry(day(4), { weightKg: 82.6, steps: 9000 }),
        entry(day(5), { weightKg: 82.65, steps: 9500 }),
        entry(day(6), { weightKg: 82.75, steps: 10000 }),
        entry(day(7), { weightKg: 82.8, steps: 10500 }),
        entry(day(8), { weightKg: 82.85 }),
      ]
      render(<StepsCorrelationView entries={entries} />)

      const title = 'Steps vs. next-day weight'
      expect(screen.getByText(title)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: `Hide ${title}` }))

      expect(
        screen.queryByText(/averaged more weight gain the next morning/),
      ).not.toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
      const showButton = screen.getByRole('button', { name: `Show ${title}` })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(
        screen.getByText(/averaged more weight gain the next morning/),
      ).toBeInTheDocument()
    })
  })
})
