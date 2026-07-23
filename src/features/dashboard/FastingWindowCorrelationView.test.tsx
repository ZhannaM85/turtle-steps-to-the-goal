import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore, useOutlierExclusionStore } from '@/stores'
import { FastingWindowCorrelationView } from './FastingWindowCorrelationView'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

function mealAt(timeEaten: string): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal: 500 }],
      timeEaten,
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

// Same alternating 22:00/07:00 fixture as fastingWindow.test.ts's own
// "reports the shorter-fast half" case — 10 pairs, 5 short (9h) and 5
// long (39h), weight climbing faster across the short-fast pairs.
const TEN_PAIR_ENTRIES: DailyEntry[] = [
  entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('22:00') }),
  entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('07:00') }),
  entry(day(2), { weightKg: 80.55, calorieEntries: mealAt('22:00') }),
  entry(day(3), { weightKg: 81.05, calorieEntries: mealAt('07:00') }),
  entry(day(4), { weightKg: 81.1, calorieEntries: mealAt('22:00') }),
  entry(day(5), { weightKg: 81.6, calorieEntries: mealAt('07:00') }),
  entry(day(6), { weightKg: 81.65, calorieEntries: mealAt('22:00') }),
  entry(day(7), { weightKg: 82.15, calorieEntries: mealAt('07:00') }),
  entry(day(8), { weightKg: 82.2, calorieEntries: mealAt('22:00') }),
  entry(day(9), { weightKg: 82.7, calorieEntries: mealAt('07:00') }),
  entry(day(10), { weightKg: 82.75, calorieEntries: mealAt('22:00') }),
]

describe('FastingWindowCorrelationView', () => {
  it('renders nothing with no comparable day-pairs at all', () => {
    const { container } = render(<FastingWindowCorrelationView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 10 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: mealAt('20:00') }),
      entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('08:00') }),
    ]
    render(<FastingWindowCorrelationView entries={entries} />)

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('collapses the near-empty plot by default with fewer than 10 pairs', async () => {
    const user = userEvent.setup()
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: mealAt('20:00') }),
      entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('08:00') }),
    ]
    const { container } = render(
      <FastingWindowCorrelationView entries={entries} />,
    )

    expect(container.querySelector('.recharts-wrapper')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show chart' }))

    expect(
      screen.getByRole('button', { name: 'Hide chart' }),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    render(<FastingWindowCorrelationView entries={TEN_PAIR_ENTRIES} />)

    expect(
      screen.getByText(/averaged more weight gain the next morning/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 10 days of data\./)).toBeInTheDocument()
  })

  describe('outlier detection and exclusion (#224)', () => {
    afterEach(() => {
      localStorage.clear()
      useOutlierExclusionStore.setState({ excluded: {} })
    })

    // TEN_PAIR_ENTRIES' own 10 clean pairs, plus an 11th (same 9h fasting
    // window as the others, so no X-outlier) whose delta (-12.75kg) is
    // wildly outside the pattern.
    function entriesWithOneOutlier(): DailyEntry[] {
      return [
        ...TEN_PAIR_ENTRIES,
        entry(day(11), { weightKg: 70.0, calorieEntries: mealAt('07:00') }),
      ]
    }

    it('lists the flagged outlier day as an excludable button', () => {
      render(<FastingWindowCorrelationView entries={entriesWithOneOutlier()} />)

      expect(
        screen.getByRole('button', { name: 'Exclude 12 Mar from this pattern' }),
      ).toBeInTheDocument()
    })

    it('excludes the flagged day from the summary once tapped', async () => {
      const user = userEvent.setup()
      render(<FastingWindowCorrelationView entries={entriesWithOneOutlier()} />)

      expect(screen.getByText(/Based on 11 days of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Exclude 12 Mar from this pattern' }),
      )

      expect(screen.getByText(/Based on 10 days of data\./)).toBeInTheDocument()
    })

    it('restores an excluded day when tapped again', async () => {
      const user = userEvent.setup()
      render(<FastingWindowCorrelationView entries={entriesWithOneOutlier()} />)

      await user.click(
        screen.getByRole('button', { name: 'Exclude 12 Mar from this pattern' }),
      )
      expect(screen.getByText(/Based on 10 days of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: 'Restore 12 Mar to this pattern' }),
      )

      expect(screen.getByText(/Based on 11 days of data\./)).toBeInTheDocument()
    })
  })

  describe('whole-card show/hide toggle (#247)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, fastingWindowCorrelation: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      render(<FastingWindowCorrelationView entries={TEN_PAIR_ENTRIES} />)

      const title = 'Fasting window vs. next-day weight'
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
