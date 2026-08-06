import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format, startOfISOWeek } from 'date-fns'
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
const WEEK_1_START = format(
  startOfISOWeek(new Date('2026-03-02T00:00:00.000Z')),
  DATE_FORMAT,
)

function weekStart(weekIndex: number): string {
  return format(
    addDays(new Date(`${WEEK_1_START}T00:00:00.000Z`), weekIndex * 7),
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

/** Extends the data window past the last comparable week's Sunday so
 * #522's incomplete-week gate keeps those weeks. */
function withCompletedWindow(
  entries: DailyEntry[],
  lastComparableWeekIndex: number,
): DailyEntry[] {
  const lastWeight =
    [...entries].reverse().find((e) => e.weightKg !== undefined)?.weightKg ?? 80
  return [
    ...entries,
    entry(weekStart(lastComparableWeekIndex + 1), { weightKg: lastWeight }),
  ]
}

describe('CorrelationView', () => {
  it('renders nothing when there are no comparable weeks', () => {
    const { container } = render(<CorrelationView entries={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 4 comparable weeks', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1800) }),
      ],
      1,
    )
    render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('collapses the near-empty plot by default with fewer than 4 comparable weeks (#89)', async () => {
    const user = userEvent.setup()
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1800) }),
      ],
      1,
    )
    const { container } = render(<CorrelationView entries={entries} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
    expect(container.querySelector('.recharts-wrapper')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show chart' }))

    expect(
      screen.getByRole('button', { name: 'Hide chart' }),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }),
        entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }),
        entry(weekStart(3), { weightKg: 85.5, calorieEntries: calories(2200) }),
        entry(weekStart(4), { weightKg: 85.3, calorieEntries: calories(2300) }),
      ],
      4,
    )
    render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

    expect(
      screen.getByText(/averaged more loss than weeks/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 4 weeks of data\./)).toBeInTheDocument()
  })

  it('notes when the current in-progress week is left out of the count (#613)', () => {
    // Same 4 finished comparable weeks (1-4) as the fixture above, plus a
    // 5th week logged only on its first day — real weight+calories, but
    // with nothing extending past its own Sunday, #522's gate leaves it
    // out of the count (unlike `withCompletedWindow`, deliberately not
    // used here).
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }),
      entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }),
      entry(weekStart(3), { weightKg: 85.5, calorieEntries: calories(2200) }),
      entry(weekStart(4), { weightKg: 85.3, calorieEntries: calories(2300) }),
      entry(weekStart(5), { weightKg: 85.1, calorieEntries: calories(2100) }),
    ]
    render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

    expect(screen.getByText(/Based on 4 weeks of data\./)).toBeInTheDocument()
    expect(screen.getByText(/This week isn't finished yet/)).toBeInTheDocument()
  })

  it('shows no current-week note once every comparable week has actually finished', () => {
    const entries = withCompletedWindow(
      [
        entry(weekStart(0), { weightKg: 90 }),
        entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }),
        entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }),
        entry(weekStart(3), { weightKg: 85.5, calorieEntries: calories(2200) }),
        entry(weekStart(4), { weightKg: 85.3, calorieEntries: calories(2300) }),
      ],
      4,
    )
    render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

    expect(
      screen.queryByText(/This week isn't finished yet/),
    ).not.toBeInTheDocument()
  })

  describe('outlier detection and exclusion (#224)', () => {
    afterEach(() => {
      localStorage.clear()
      useOutlierExclusionStore.setState({ excluded: {} })
    })

    // The plain-language-summary fixture's 4 clean weeks, plus a 5th whose
    // delta (-25.3kg) is wildly outside that pattern (its own calorie
    // figure, 2000, is unremarkable, so this is a clean Y-axis-only case).
    // Trailing weight-only day keeps week 5 past #522's incomplete-week gate.
    function entriesWithOneOutlier(): DailyEntry[] {
      return withCompletedWindow(
        [
          entry(weekStart(0), { weightKg: 90 }),
          entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }),
          entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }),
          entry(weekStart(3), {
            weightKg: 85.5,
            calorieEntries: calories(2200),
          }),
          entry(weekStart(4), {
            weightKg: 85.3,
            calorieEntries: calories(2300),
          }),
          entry(weekStart(5), { weightKg: 60, calorieEntries: calories(2000) }),
        ],
        5,
      )
    }

    it('lists the flagged outlier week as an excludable button', () => {
      render(<CorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.getByRole('button', { name: /Exclude 6 Apr 2026/ }),
      ).toBeInTheDocument()
    })

    it("links the flagged outlier week to that week's start on Today (#372, #389)", () => {
      render(<CorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      const link = screen.getByRole('link', {
        name: 'Edit 6 Apr 2026',
      })
      expect(link).toHaveAttribute('href', '/?date=2026-04-06')
    })

    it("links to the day within the flagged week that actually has the logged weight, not always the week's Monday (#631)", () => {
      // Same fixture as `entriesWithOneOutlier`, except week 5's weight is
      // logged two days after its Monday — that Monday itself has nothing.
      const entries = withCompletedWindow(
        [
          entry(weekStart(0), { weightKg: 90 }),
          entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }),
          entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }),
          entry(weekStart(3), {
            weightKg: 85.5,
            calorieEntries: calories(2200),
          }),
          entry(weekStart(4), {
            weightKg: 85.3,
            calorieEntries: calories(2300),
          }),
          entry(
            format(
              addDays(new Date(`${weekStart(5)}T00:00:00.000Z`), 2),
              DATE_FORMAT,
            ),
            {
              weightKg: 60,
              calorieEntries: calories(2000),
            },
          ),
        ],
        5,
      )
      render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

      const link = screen.getByRole('link', {
        name: 'Edit 6 Apr 2026',
      })
      expect(link).toHaveAttribute('href', '/?date=2026-04-08')
    })

    it('excludes the flagged week from the summary once tapped', async () => {
      const user = userEvent.setup()
      render(<CorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      expect(screen.getByText(/Based on 5 weeks of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: /Exclude 6 Apr 2026/ }),
      )

      expect(screen.getByText(/Based on 4 weeks of data\./)).toBeInTheDocument()
    })

    it('restores an excluded week when tapped again', async () => {
      const user = userEvent.setup()
      render(<CorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      await user.click(
        screen.getByRole('button', { name: /Exclude 6 Apr 2026/ }),
      )
      expect(screen.getByText(/Based on 4 weeks of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: /Restore 6 Apr 2026/ }),
      )

      expect(screen.getByText(/Based on 5 weeks of data\./)).toBeInTheDocument()
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
      const entries = withCompletedWindow(
        [
          entry(weekStart(0), { weightKg: 90 }),
          entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }),
          entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }),
          entry(weekStart(3), {
            weightKg: 85.5,
            calorieEntries: calories(2200),
          }),
          entry(weekStart(4), {
            weightKg: 85.3,
            calorieEntries: calories(2300),
          }),
        ],
        4,
      )
      render(<CorrelationView entries={entries} />, { wrapper: MemoryRouter })

      expect(screen.getByText('Calories vs. weight change')).toBeInTheDocument()
      const hideButton = screen.getByRole('button', {
        name: 'Hide Calories vs. weight change',
      })

      await user.click(hideButton)

      expect(
        screen.queryByText(/averaged more loss than weeks/),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Calories vs. weight change')).toBeInTheDocument()
      const showButton = screen.getByRole('button', {
        name: 'Show Calories vs. weight change',
      })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(
        screen.getByText(/averaged more loss than weeks/),
      ).toBeInTheDocument()
    })
  })
})
