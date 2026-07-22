import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore, useFastingCutoffStore } from '@/stores'
import { FastingCutoffComparisonView } from './FastingCutoffComparisonView'

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

// Same fixture as lateMealCorrelation.test.ts's own "reports the
// later-eating half" case — 8 pairs, first 4 eating before 18:00, last 4
// after, weight climbing faster in the after group.
const EIGHT_PAIR_ENTRIES: DailyEntry[] = [
  entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:00') }),
  entry(day(1), { weightKg: 80.1, calorieEntries: mealAt('12:30') }),
  entry(day(2), { weightKg: 80.2, calorieEntries: mealAt('13:00') }),
  entry(day(3), { weightKg: 80.25, calorieEntries: mealAt('13:30') }),
  entry(day(4), { weightKg: 80.4, calorieEntries: mealAt('22:00') }),
  entry(day(5), { weightKg: 81.2, calorieEntries: mealAt('22:30') }),
  entry(day(6), { weightKg: 81.9, calorieEntries: mealAt('23:00') }),
  entry(day(7), { weightKg: 82.8, calorieEntries: mealAt('23:30') }),
  entry(day(8), { weightKg: 83.4 }),
]

describe('FastingCutoffComparisonView', () => {
  afterEach(() => {
    useFastingCutoffStore.setState({ cutoffTime: '18:00' })
  })

  it('renders nothing with no comparable day-pairs at all', () => {
    const { container } = render(<FastingCutoffComparisonView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    render(<FastingCutoffComparisonView entries={entries} />)

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary using the Settings cutoff time', () => {
    render(<FastingCutoffComparisonView entries={EIGHT_PAIR_ENTRIES} />)

    expect(
      screen.getByText(
        'Days you last ate after 18:00 averaged more weight gain the next morning than days you ate before it.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
    expect(screen.getByText('Strong pattern')).toBeInTheDocument()
  })

  // recharts renders no real content in jsdom (ResponsiveContainer needs
  // real layout dimensions) — the bar chart's own category labels aren't
  // assertable here, so this checks the summary sentence picks up the
  // new cutoff instead, which is real DOM text.
  it('re-buckets using a different Settings cutoff time', () => {
    useFastingCutoffStore.setState({ cutoffTime: '13:00' })
    render(<FastingCutoffComparisonView entries={EIGHT_PAIR_ENTRIES} />)

    expect(
      screen.getByText(
        'Days you last ate after 13:00 averaged more weight gain the next morning than days you ate before it.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the empty-data message when the cutoff puts every pair on one side', () => {
    useFastingCutoffStore.setState({ cutoffTime: '00:01' })
    render(<FastingCutoffComparisonView entries={EIGHT_PAIR_ENTRIES} />)

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  describe('whole-card show/hide toggle (#247)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, fastingCutoffComparison: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      render(<FastingCutoffComparisonView entries={EIGHT_PAIR_ENTRIES} />)

      const title = 'Eating cutoff comparison'
      const summary =
        'Days you last ate after 18:00 averaged more weight gain the next morning than days you ate before it.'
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(screen.getByText(summary)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: `Hide ${title}` }))

      expect(screen.queryByText(summary)).not.toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
      const showButton = screen.getByRole('button', { name: `Show ${title}` })
      expect(showButton).toBeInTheDocument()

      await user.click(showButton)
      expect(screen.getByText(summary)).toBeInTheDocument()
    })
  })
})
