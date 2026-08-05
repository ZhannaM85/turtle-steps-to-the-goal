import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  useAlcoholTrackingStore,
  useDashboardChartVisibilityStore,
  useOutlierExclusionStore,
} from '@/stores'
import { AlcoholCorrelationView } from './AlcoholCorrelationView'

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

function fullEntries(): DailyEntry[] {
  return [
    entry(day(0), { weightKg: 80.0, hadAlcohol: false }),
    entry(day(1), { weightKg: 80.1, hadAlcohol: false }),
    entry(day(2), { weightKg: 80.2, hadAlcohol: false }),
    entry(day(3), { weightKg: 80.25, hadAlcohol: false }),
    entry(day(4), { weightKg: 80.4, hadAlcohol: true }),
    entry(day(5), { weightKg: 81.2, hadAlcohol: true }),
    entry(day(6), { weightKg: 81.9, hadAlcohol: true }),
    entry(day(7), { weightKg: 82.8, hadAlcohol: true }),
    entry(day(8), { weightKg: 83.4 }),
  ]
}

beforeEach(() => {
  useAlcoholTrackingStore.setState({ enabled: true })
})

afterEach(() => {
  useAlcoholTrackingStore.setState({ enabled: false })
})

describe('AlcoholCorrelationView (#607)', () => {
  it('renders nothing when alcohol tracking is off in Settings, even with data', () => {
    useAlcoholTrackingStore.setState({ enabled: false })
    const { container } = render(
      <AlcoholCorrelationView entries={fullEntries()} />,
      { wrapper: MemoryRouter },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing with no comparable day-pairs at all', () => {
    const { container } = render(<AlcoholCorrelationView entries={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, hadAlcohol: true }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    render(<AlcoholCorrelationView entries={entries} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    render(<AlcoholCorrelationView entries={fullEntries()} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByText(
        "Days you logged alcohol averaged more weight gain the next morning than days you didn't.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
  })

  describe('outlier detection and exclusion (#224 mechanism)', () => {
    afterEach(() => {
      localStorage.clear()
      useOutlierExclusionStore.setState({ excluded: {} })
    })

    function entriesWithOneOutlier(): DailyEntry[] {
      return [
        entry(day(0), { weightKg: 80.0, hadAlcohol: false }),
        entry(day(1), { weightKg: 80.1, hadAlcohol: false }),
        entry(day(2), { weightKg: 80.2, hadAlcohol: false }),
        entry(day(3), { weightKg: 80.25, hadAlcohol: false }),
        entry(day(4), { weightKg: 80.4, hadAlcohol: true }),
        entry(day(5), { weightKg: 81.2, hadAlcohol: true }),
        entry(day(6), { weightKg: 81.9, hadAlcohol: true }),
        entry(day(7), { weightKg: 82.8, hadAlcohol: true }),
        entry(day(8), { weightKg: 83.4, hadAlcohol: false }),
        entry(day(9), { weightKg: 70.0 }),
      ]
    }

    it('lists the flagged outlier day as an excludable button', () => {
      render(<AlcoholCorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.getByRole('button', { name: /Exclude 9 Mar 2026/ }),
      ).toBeInTheDocument()
    })

    it('excludes the flagged day from the summary once tapped', async () => {
      const user = userEvent.setup()
      render(<AlcoholCorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      expect(screen.getByText(/Based on 9 days of data\./)).toBeInTheDocument()

      await user.click(
        screen.getByRole('button', { name: /Exclude 9 Mar 2026/ }),
      )

      expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
    })
  })

  describe('whole-card show/hide toggle (#247 mechanism)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, alcoholCorrelation: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      render(<AlcoholCorrelationView entries={fullEntries()} />, {
        wrapper: MemoryRouter,
      })

      const title = 'Alcohol vs. next-day weight'
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
