import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, format } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDashboardChartVisibilityStore, useOutlierExclusionStore } from '@/stores'
import { NightEatingCorrelationView } from './NightEatingCorrelationView'

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

describe('NightEatingCorrelationView', () => {
  it('shows empty state with no comparable day-pairs at all', () => {
    render(<NightEatingCorrelationView entries={[]} />, {
      wrapper: MemoryRouter,
    })
    expect(
      screen.getByText('Night eating vs. next-day weight'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Not enough data yet to see a pattern — keep logging meal times (or the night-eating toggle directly) and tracking weight, then check back in a few weeks.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the not-enough-data caveat with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, nightEatingOverride: true }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    render(<NightEatingCorrelationView entries={entries} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByText(/Not enough data yet to see a pattern/),
    ).toBeInTheDocument()
  })

  it('collapses the near-empty plot by default with fewer than 8 pairs', async () => {
    const user = userEvent.setup()
    const entries = [
      entry(day(0), { weightKg: 80, nightEatingOverride: true }),
      entry(day(1), { weightKg: 80.5 }),
    ]
    const { container } = render(
      <NightEatingCorrelationView entries={entries} />,
      { wrapper: MemoryRouter },
    )

    expect(container.querySelector('.recharts-wrapper')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show chart' }))

    expect(
      screen.getByRole('button', { name: 'Hide chart' }),
    ).toBeInTheDocument()
  })

  it('shows the plain-language summary once there is enough data', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, nightEatingOverride: false }),
      entry(day(1), { weightKg: 80.1, nightEatingOverride: false }),
      entry(day(2), { weightKg: 80.2, nightEatingOverride: false }),
      entry(day(3), { weightKg: 80.25, nightEatingOverride: false }),
      entry(day(4), { weightKg: 80.4, nightEatingOverride: true }),
      entry(day(5), { weightKg: 81.2, nightEatingOverride: true }),
      entry(day(6), { weightKg: 81.9, nightEatingOverride: true }),
      entry(day(7), { weightKg: 82.8, nightEatingOverride: true }),
      entry(day(8), { weightKg: 83.4 }),
    ]
    render(<NightEatingCorrelationView entries={entries} />, {
      wrapper: MemoryRouter,
    })

    expect(
      screen.getByText(
        "Nights you ate late averaged more weight gain the next morning than nights you didn't.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/Based on 8 days of data\./)).toBeInTheDocument()
  })

  describe('outlier detection and exclusion (#224 mechanism)', () => {
    afterEach(() => {
      localStorage.clear()
      useOutlierExclusionStore.setState({ excluded: {} })
    })

    // 9 pairs: 8 following a clean night-eating-means-more-gain pattern,
    // plus a 9th whose delta (-13.4kg) is wildly outside that pattern — a
    // clear Y-axis-only outlier (its own predictor day has no override or
    // logged meals, so it's an unremarkable "No" point on the X axis).
    function entriesWithOneOutlier(): DailyEntry[] {
      return [
        entry(day(0), { weightKg: 80.0, nightEatingOverride: false }),
        entry(day(1), { weightKg: 80.1, nightEatingOverride: false }),
        entry(day(2), { weightKg: 80.2, nightEatingOverride: false }),
        entry(day(3), { weightKg: 80.25, nightEatingOverride: false }),
        entry(day(4), { weightKg: 80.4, nightEatingOverride: true }),
        entry(day(5), { weightKg: 81.2, nightEatingOverride: true }),
        entry(day(6), { weightKg: 81.9, nightEatingOverride: true }),
        entry(day(7), { weightKg: 82.8, nightEatingOverride: true }),
        entry(day(8), { weightKg: 83.4, nightEatingOverride: false }),
        entry(day(9), { weightKg: 70.0 }),
      ]
    }

    it('lists the flagged outlier day as an excludable button', () => {
      render(<NightEatingCorrelationView entries={entriesWithOneOutlier()} />, {
        wrapper: MemoryRouter,
      })

      expect(
        screen.getByRole('button', { name: /Exclude 9 Mar 2026/ }),
      ).toBeInTheDocument()
    })

    it('excludes the flagged day from the summary once tapped', async () => {
      const user = userEvent.setup()
      render(<NightEatingCorrelationView entries={entriesWithOneOutlier()} />, {
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
      render(<NightEatingCorrelationView entries={entriesWithOneOutlier()} />, {
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

  describe('whole-card show/hide toggle (#247 mechanism)', () => {
    afterEach(() => {
      useDashboardChartVisibilityStore.setState((state) => ({
        visible: { ...state.visible, nightEatingCorrelation: true },
      }))
    })

    it('hides the card body but keeps the title and toggle visible', async () => {
      const user = userEvent.setup()
      const entries = [
        entry(day(0), { weightKg: 80.0, nightEatingOverride: false }),
        entry(day(1), { weightKg: 80.1, nightEatingOverride: false }),
        entry(day(2), { weightKg: 80.2, nightEatingOverride: false }),
        entry(day(3), { weightKg: 80.25, nightEatingOverride: false }),
        entry(day(4), { weightKg: 80.4, nightEatingOverride: true }),
        entry(day(5), { weightKg: 81.2, nightEatingOverride: true }),
        entry(day(6), { weightKg: 81.9, nightEatingOverride: true }),
        entry(day(7), { weightKg: 82.8, nightEatingOverride: true }),
        entry(day(8), { weightKg: 83.4 }),
      ]
      render(<NightEatingCorrelationView entries={entries} />, {
        wrapper: MemoryRouter,
      })

      const title = 'Night eating vs. next-day weight'
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
