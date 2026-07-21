import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { afterEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore } from '@/stores'
import { SleepCorrelationView } from './SleepCorrelationView'

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

describe('SleepCorrelationView', () => {
  it('renders nothing with no comparable day-pairs at all', () => {
    const { container } = render(<SleepCorrelationView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, sleepHours: 7 }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    render(<SleepCorrelationView entries={entries} />)

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('collapses the near-empty plot by default with fewer than 8 pairs', async () => {
    const user = userEvent.setup()
    const entries = [
      entry(day(0), { weightKg: 80, sleepHours: 7 }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    const { container } = render(<SleepCorrelationView entries={entries} />)

    expect(container.querySelector('.recharts-wrapper')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show chart' }))

    expect(
      screen.getByRole('button', { name: 'Hide chart' }),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, sleepHours: 4 }),
      entry(day(1), { weightKg: 80.8, sleepHours: 4.5 }),
      entry(day(2), { weightKg: 81.7, sleepHours: 5 }),
      entry(day(3), { weightKg: 82.5, sleepHours: 5.5 }),
      entry(day(4), { weightKg: 82.6, sleepHours: 8 }),
      entry(day(5), { weightKg: 82.65, sleepHours: 8.5 }),
      entry(day(6), { weightKg: 82.75, sleepHours: 9 }),
      entry(day(7), { weightKg: 82.8, sleepHours: 9.5 }),
      entry(day(8), { weightKg: 82.85 }),
    ]
    render(<SleepCorrelationView entries={entries} />)

    expect(
      screen.getByText(/averaged more weight gain the next morning/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
  })

  describe('whole-card show/hide toggle (#247)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, sleepCorrelation: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      const entries = [
        entry(day(0), { weightKg: 80.0, sleepHours: 4 }),
        entry(day(1), { weightKg: 80.8, sleepHours: 4.5 }),
        entry(day(2), { weightKg: 81.7, sleepHours: 5 }),
        entry(day(3), { weightKg: 82.5, sleepHours: 5.5 }),
        entry(day(4), { weightKg: 82.6, sleepHours: 8 }),
        entry(day(5), { weightKg: 82.65, sleepHours: 8.5 }),
        entry(day(6), { weightKg: 82.75, sleepHours: 9 }),
        entry(day(7), { weightKg: 82.8, sleepHours: 9.5 }),
        entry(day(8), { weightKg: 82.85 }),
      ]
      render(<SleepCorrelationView entries={entries} />)

      const title = 'Sleep vs. next-day weight'
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
